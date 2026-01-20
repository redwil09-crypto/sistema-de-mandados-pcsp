
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabase } from "../supabaseClient";

let cachedGlobalKey: string | null = null;
const MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-pro",
    "gemini-1.0-pro"
];

const fetchGlobalKey = async () => {
    if (cachedGlobalKey) return cachedGlobalKey;
    try {
        const { data } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'gemini_api_key')
            .single();

        if (data?.value) {
            cachedGlobalKey = data.value;
            return data.value;
        }
    } catch (e) {
        console.error("Erro ao buscar chave global:", e);
    }
    return '';
};

const getGeminiKey = async () => {
    // 1. Try Local Storage (User Profile)
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim().length > 10) return localKey.trim();

    // 2. Try Supabase Global Settings
    const globalKey = await fetchGlobalKey();
    if (globalKey) return globalKey.trim();

    // 3. Try Environment Variable
    return (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
};

export const isGeminiEnabled = async () => {
    const key = await getGeminiKey();
    return !!key;
};

const generateContentViaFetch = async (model: string, prompt: string, key: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        })
    });

    if (!response.ok) {
        let errorBody = await response.text();
        try {
            const jsonError = JSON.parse(errorBody);
            if (jsonError.error) {
                errorBody = `${jsonError.error.status || response.status} - ${jsonError.error.message}`;
            }
        } catch (e) {
            // Raw text
        }
        throw new Error(errorBody);
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error("Resposta da IA vazia ou inválida.");
};

// Função para descobrir dinamicamente qual modelo está disponível para esta chave
const getBestAvailableModel = async (key: string): Promise<string> => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) return "gemini-1.5-flash"; // Fallback cego se falhar a lista

        const data = await response.json();
        if (!data.models) return "gemini-1.5-flash";

        // Filtra modelos que geram conteúdo e são da família Gemini 1.5 ou Pro
        const availableParams = data.models
            .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
            .map((m: any) => m.name.replace("models/", ""));

        console.log("DEBUG GEMINI: Modelos disponíveis para esta chave:", availableParams);

        // Ordem de preferência
        const preference = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-1.5-pro-latest",
            "gemini-pro",
            "gemini-1.0-pro"
        ];

        // Tenta achar o melhor
        for (const pref of preference) {
            if (availableParams.includes(pref)) return pref;
        }

        // Se nenhum da preferência estiver, pega o primeiro gemini que achar
        const anyGemini = availableParams.find((n: string) => n.includes("gemini"));
        return anyGemini || "gemini-1.5-flash";

    } catch (e) {
        console.warn("DEBUG GEMINI: Falha ao listar modelos, usando fallback padrão.");
        return "gemini-1.5-flash";
    }
};

// Helper to attempt generation with fallback models
async function tryGenerateContent(prompt: string, options: any = {}): Promise<string> {
    const key = await getGeminiKey();
    if (!key) throw new Error("Chave API não encontrada. Configure no Perfil.");

    // 1. Descobre qual modelo funciona para esta chave
    const modelName = await getBestAvailableModel(key);
    console.log(`DEBUG GEMINI: Usando modelo detectado: ${modelName}`);

    // 2. Tenta gerar com o modelo descoberto
    try {
        const text = await generateContentViaFetch(modelName, prompt, key);
        if (text) return text;
    } catch (error: any) {
        console.error(`DEBUG GEMINI: Falha com modelo ${modelName}:`, error);

        // Se falhar (ex: sobrecarga), tenta um fallback hardcoded básico apenas por garantia
        if (modelName !== 'gemini-pro') {
            try {
                console.log("DEBUG GEMINI: Tentando fallback para gemini-pro...");
                return await generateContentViaFetch("gemini-pro", prompt, key);
            } catch (e) {
                // ignora e lanca o erro original
            }
        }

        const msg = error.message || "Erro desconhecido";
        if (msg.includes("403") || msg.includes("API_KEY") || msg.includes("not found")) {
            throw new Error(`Erro de Acesso (${modelName}): Verifique se sua Chave API suporta este modelo. Detalhe: ${msg}`);
        }
        throw new Error(`Falha na IA (${modelName}): ${msg}`);
    }

    throw new Error("Falha ao gerar resposta.");
}

export async function analyzeRawDiligence(warrantData: any, rawInfo: string) {
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        Você é Antigravity, um Especialista em Inteligência Policial de alto nível.
        Sua missão é analisar informações brutas (diligências, observações, informes) colhidas por equipes de campo sobre um alvo de mandado judicial.

        DADOS DO ALVO:
        ${JSON.stringify(warrantData, null, 2)}

        INFORMAÇÃO BRUTA COLETADA:
        "${rawInfo}"

        Sua análise deve:
        1. CONFRONTAR: Verifique se a informação nova contradiz ou confirma dados já existentes (endereço, rotina, contatos).
        2. INSIGHTS: Identifique padrões ocultos (ex: horários de maior vulnerabilidade, possíveis refúgios, comportamento de fuga).
        3. OPINIÃO TÁTICA: Sugira a melhor abordagem ou o próximo passo para a captura, avaliando o risco.
        4. IDENTIFICAÇÃO: Extraia nomes, apelidos, veículos (placas) ou endereços mencionados.

        Responda de forma profissional, direta e em formato Markdown estruturado para leitura rápida em dispositivos móveis.
        Use emojis para sinalizar pontos críticos.
    `;

    try {
        return await tryGenerateContent(prompt);
    } catch (error) {
        console.error("Erro no Gemini (Análise Bruta):", error);
        return "Erro ao processar análise de inteligência. Verifique sua chave de API.";
    }
}

export async function generateReportBody(warrantData: any, rawContent: string, instructions: string): Promise<string> {
    if (!(await isGeminiEnabled())) {
        return "Erro: IA não habilitada ou sem chave.";
    }

    const prompt = `
        # MANUAL DE REDAÇÃO DE RELATÓRIOS POLICIAIS (PADRÃO ELITE PCSP)

        VOCÊ É UM "MOTOR DE CÓPIA INTELIGENTE".
        SUA MISSÃO: Ler os dados do caso e escolher, dentre os exemplos abaixo, qual se encaixa perfeitamente.
        SUA AÇÃO: Copiar o texto do exemplo escolhido e substituir APENAS os dados entre colchetes [ ].
        NÃO MUDE O ESTILO. NÃO MUDE A ESTRUTURA. NÃO SEJA CRIATIVO.

        ---
        ## 📂 BANCO DE EXEMPLOS (Use um destes modelos EXATAMENTE como estão)

        [CENÁRIO 1: PENSÃO ALIMENTÍCIA + OUTRA COMARCA]
        "Em cumprimento ao Mandado de Prisão Civil, expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], referente ao inadimplemento de pensão alimentícia, foram realizadas consultas e diligências preliminares visando à localização do executado [NOME_DO_ALVO] nesta Comarca de Jacareí/SP.\n\nInicialmente foram efetuadas pesquisas atualizadas nos sistemas policiais e de cadastro, não sendo localizado qualquer endereço ativo vinculado ao réu no município de Jacareí/SP, inexistindo registros recentes de residência, vínculos profissionais ou outras informações que possibilitassem sua localização nesta circunscrição.\n\nConsiderando a ausência de dados nesta comarca e observando-se que, no próprio mandado judicial, consta o endereço:\n[ENDEREÇO_DO_MANDADO],\nsugere-se o envio do presente expediente à autoridade policial daquele município, a fim de que a equipe local possa prosseguir com as diligências e tentar o cumprimento da ordem judicial no endereço indicado.\n\nDiante do exposto, até o presente momento não houve êxito na localização do executado nesta Comarca, restando as diligências negativas."

        [CENÁRIO 2: CONTATO COM MÃE/FAMILIAR - NÃO MORA MAIS]
        "Em cumprimento ao Mandado de Prisão referente ao Processo nº [NÚMERO_DO_PROCESSO], expedido pela [VARA] da Comarca de Jacareí/SP, foram realizadas diligências no endereço indicado como possível residência do réu [NOME_DO_ALVO], situado na [ENDEREÇO_DILIGENCIADO].\n\nAo chegar ao local, os policiais foram atendidos pela Sra. [NOME_DA_PESSOA_ATENDIDA] (RG [RG_SE_HOUVER]), [GRAU_PARENTESCO] do procurado, a qual relatou que [ELE/ELA] não reside mais no endereço e que saiu de casa há muito tempo, não mantendo contato e não possuindo informações que possam contribuir para sua localização. Após apresentação do mandado judicial, foi franqueado o acesso ao imóvel, sendo realizada busca em todos os cômodos da residência, sem êxito.\n\nPor fim, foram realizadas consultas atualizadas nos sistemas policiais, as quais, até o presente momento, não apontaram novos endereços, vínculos ou informações úteis que possam levar à localização de [NOME_DO_ALVO] nesta cidade.\n\nDiante do exposto, as diligências foram encerradas sem êxito na localização do procurado."

        [CENÁRIO 3: COMERCIAL / DESCONHECIDO NO LOCAL]
        "Em cumprimento ao Mandado de Prisão Civil expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], referente à obrigação alimentar, esta equipe dirigiu-se inicialmente ao endereço indicado no ofício, situado na [ENDEREÇO].\n\nNo local, esta equipe foi recebida pelo proprietário, Sr. [NOME_QUEM_ATENDEU], o qual declarou não conhecer [NOME_DO_ALVO], bem como afirmou jamais ter contratado pessoa com nome ou características semelhantes às do executado.\n\nAssim, até o presente momento, não houve êxito no cumprimento do mandado, permanecendo negativas as diligências empreendidas por esta equipe."

        [CENÁRIO 4: IMÓVEL ALUGA-SE / VENDE-SE / VAZIO]
        "Em cumprimento ao mandado de prisão civil expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], oriundo da [VARA] da Comarca de Jacareí/SP, em desfavor de [NOME_DO_ALVO], esta equipe realizou diligências no endereço indicado — [ENDEREÇO].\n\nForam efetuadas visitas em dias e horários distintos, constatando-se que o imóvel encontra-se com placas de “aluga-se” e “vende-se”, sem qualquer movimentação que indicasse a presença de moradores ou ocupação regular da residência.\n\nAté o momento, não foram obtidos elementos que indiquem o paradeiro do procurado, permanecendo negativas as diligências."

        [CENÁRIO 5: VIZINHOS DIZEM QUE NÃO VÊEM HÁ TEMPOS]
        "Em cumprimento ao mandado expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], oriundo da [VARA] da Comarca de Jacareí/SP, em desfavor de [NOME_DO_ALVO], esta equipe diligenciou no endereço indicado — [ENDEREÇO].\n\nForam realizadas verificações in loco em dias e horários diversos, ocasião em que se constatou ausência de sinais de habitação ou qualquer indício de presença recente do procurado no imóvel.\n\nProcedeu-se à entrevista com moradores lindeiros, os quais informaram que há considerável lapso temporal não visualizam o requerido naquela localidade, bem como desconhecem seu atual paradeiro.\n\nDiante do exposto, as diligências restaram infrutíferas, não sendo obtidos elementos que permitam, até o presente momento, a localização do procurado."

        [CENÁRIO 6: NUMERAL NÃO LOCALIZADO / TELEFONE SEM RESPOSTA]
        "Em cumprimento à determinação para localização de [NOME_DO_ALVO], esta equipe diligenciou ao endereço informado: [ENDEREÇO].\n\nNo local, não foi possível identificar o numeral informado, inexistindo a numeração indicada na referida via.\n\nAlém disso, foram realizadas diversas tentativas de contato telefônico, contudo, as chamadas foram sistematicamente encerradas ou não atendidas.\n\nDessa forma, [O/A] alvo não foi localizado(a) até o presente momento, permanecendo as diligências em andamento."

        [CENÁRIO 7: PRISÃO EFETUADA (SUCESSO)]
        "Em cumprimento ao mandado de prisão em desfavor de [NOME_DO_ALVO], diligenciamos ao endereço [ENDEREÇO]. No local, logramos êxito em localizar o alvo. Após confirmação da identidade, foi dada voz de prisão, sendo o capturado conduzido a esta Unidade Policial para as providências cabíveis. O uso de algemas foi necessário para garantir a integridade física da equipe e do detido, conforme Súmula Vinculante 11."

        ---
        ## DADOS REAIS DO CASO:
        ALVO: ${warrantData.name}
        PROCESSO: ${warrantData.number}
        ENDEREÇO: ${warrantData.location}
        VARA: ${warrantData.court || "Vara Criminal"}
        
        RELATO DO AGENTE (USE ISTO PARA ESCOLHER O CENÁRIO):
        "${rawContent}"

        INSTRUÇÃO EXTRA: "${instructions || 'Seguir rigorosamente o modelo.'}"

        ## TAREFA:
        1. Leia o "RELATO DO AGENTE" acima.
        2. Escolha o CENÁRIO (1 a 7) que melhor descreve o que aconteceu.
        3. Copie o texto do cenário escolhido.
        4. Substitua os campos em [ ] pelos dados reais do caso.
        5. Se faltar algum dado (ex: nome do vizinho), coloque "pessoa não identificada" ou delete a menção específica, mas MANTENHA A ESTRUTURA TÉCNICA.
        
        RESPOSTA FINAL (APENAS O TEXTO):
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return text.trim();
    } catch (error: any) {
        console.error("DEBUG GEMINI: Fatal Error in generateReportBody:", error);
        return `Erro ao processar: ${error.message}`;
    }
}

export async function analyzeWarrantData(text: string) {
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        Você é um analista de inteligência policial. 
        Analise o seguinte texto extraído de um mandado judicial ou histórico policial e extraia:
        1. Um resumo curto (máximo 2 linhas) do perigo ou modus operandi do alvo.
        2. Tags de alerta (objetivas, ex: "Perigoso", "Risco de Fuga", "Armado", "Violência Doméstica").

        TEXTO:
        "${text}"

        Responda APENAS em formato JSON:
        {
            "summary": "string",
            "warnings": ["tag1", "tag2"]
        }
    `;

    try {
        const resultText = await tryGenerateContent(prompt);
        const jsonStr = resultText.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Erro na análise da IA:", error);
        return null;
    }
}

