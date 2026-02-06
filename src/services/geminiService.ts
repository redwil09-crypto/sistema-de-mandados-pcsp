
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

const parseGeminiJSON = (text: string, fallback: any = null) => {
    try {
        if (!text) return fallback;
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn("Gemini JSON Parse Error:", e);
        return fallback;
    }
};

export async function analyzeRawDiligence(warrantData: any, rawInfo: string) {
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        Você é um Especialista em Inteligência Policial de alto nível.
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

        VOCÊ É UM "MOTOR DE CÓPIA INTELIGENTE E ADAPTATIVO".
        SUA MISSÃO: Ler os dados do caso, o CRIME envolvido, e escolher o modelo adequado abaixo.
        
        🟥 REGRA CRÍTICA DE ADAPTAÇÃO (NÃO ERRE ISSO):
        1. OLHE O CAMPO "CRIME" NOS DADOS ABAIXO.
        2. SE FOR 'PENSÃO ALIMENTÍCIA' ou 'ALAMENTOS':
           - Use termos: "Mandado de Prisão Civil", "inadimplemento de pensão", "obrigação alimentar".
        3. SE FOR OUTRO CRIME (Ex: Roubo, Tráfico, Cárcere Privado):
           - Use termos: "Mandado de Prisão", "crime de [CRIME]", "processo criminal".
           - JAMAIS cite "pensão" ou "civil" se for crime comum.
        
        ---
        ## 📂 BANCO DE CENÁRIOS (Escolha um e adapte o crime)

        [CENÁRIO 1: ENDEREÇO EM OUTRA COMARCA]
        "Em cumprimento ao [TIPO_DE_MANDADO], expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], referente a [CRIME_OU_NATUREZA], foram realizadas consultas e diligências preliminares visando à localização do executado [NOME_DO_ALVO] nesta Comarca de Jacareí/SP.\n\nInicialmente foram efetuadas pesquisas atualizadas nos sistemas policiais e de cadastro, não sendo localizado qualquer endereço ativo vinculado ao réu no município de Jacareí/SP, inexistindo registros recentes de residência, vínculos profissionais ou outras informações que possibilitassem sua localização nesta circunscrição.\n\nConsiderando a ausência de dados nesta comarca e observando-se que, no próprio mandado judicial, consta o endereço:\n[ENDEREÇO_DO_MANDADO],\nsugere-se o envio do presente expediente à autoridade policial daquele município, a fim de que a equipe local possa prosseguir com as diligências e tentar o cumprimento da ordem judicial no endereço indicado.\n\nDiante do exposto, até o presente momento não houve êxito na localização do executado nesta Comarca, restando as diligências negativas."

        [CENÁRIO 2: CONTATO COM MÃE/FAMILIAR - NÃO MORA MAIS]
        "Em cumprimento ao [TIPO_DE_MANDADO] referente ao Processo nº [NÚMERO_DO_PROCESSO], expedido pela [VARA] da Comarca de Jacareí/SP, foram realizadas diligências no endereço indicado como possível residência do réu [NOME_DO_ALVO], situado na [ENDEREÇO_DILIGENCIADO].\n\nAo chegar ao local, os policiais foram atendidos pela Sra. [NOME_DA_PESSOA_ATENDIDA] (RG [RG_SE_HOUVER]), [GRAU_PARENTESCO] do procurado, a qual relatou que [ELE/ELA] não reside mais no endereço e que saiu de casa há muito tempo, não mantendo contato e não possuindo informações que possam contribuir para sua localização. Após apresentação do mandado judicial, foi franqueado o acesso ao imóvel, sendo realizada busca em todos os cômodos da residência, sem êxito.\n\nPor fim, foram realizadas consultas atualizadas nos sistemas policiais, as quais, até o presente momento, não apontaram novos endereços, vínculos ou informações úteis que possam levar à localização de [NOME_DO_ALVO] nesta cidade.\n\nDiante do exposto, as diligências foram encerradas sem êxito na localização do procurado."

        [CENÁRIO 3: COMERCIAL / DESCONHECIDO NO LOCAL]
        "Em cumprimento ao [TIPO_DE_MANDADO] expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], referente a [CRIME_OU_NATUREZA], esta equipe dirigiu-se inicialmente ao endereço indicado no ofício, situado na [ENDEREÇO].\n\nNo local, esta equipe foi recebida pelo proprietário, Sr. [NOME_QUEM_ATENDEU], o qual declarou não conhecer [NOME_DO_ALVO], bem como afirmou jamais ter contratado pessoa com nome ou características semelhantes às do executado.\n\nAssim, até o presente momento, não houve êxito no cumprimento do mandado, permanecendo negativas as diligências empreendidas por esta equipe."

        [CENÁRIO 4: IMÓVEL ALUGA-SE / VENDE-SE / VAZIO]
        "Em cumprimento ao [TIPO_DE_MANDADO] expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], oriundo da [VARA] da Comarca de Jacareí/SP, em desfavor de [NOME_DO_ALVO], referente ao delito de [CRIME], esta equipe realizou diligências no endereço indicado — [ENDEREÇO].\n\nForam efetuadas visitas em dias e horários distintos, constatando-se que o imóvel encontra-se com placas de “aluga-se” e “vende-se”, sem qualquer movimentação que indicasse a presença de moradores ou ocupação regular da residência.\n\nAté o momento, não foram obtidos elementos que indiquem o paradeiro do procurado, permanecendo negativas as diligências."

        [CENÁRIO 5: VIZINHOS DIZEM QUE NÃO VÊEM HÁ TEMPOS]
        "Em cumprimento ao mandado expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], oriundo da [VARA] da Comarca de Jacareí/SP, em desfavor de [NOME_DO_ALVO], esta equipe diligenciou no endereço indicado — [ENDEREÇO].\n\nForam realizadas verificações in loco em dias e horários diversos, ocasião em que se constatou ausência de sinais de habitação ou qualquer indício de presença recente do procurado no imóvel.\n\nProcedeu-se à entrevista com moradores lindeiros, os quais informaram que há considerável lapso temporal não visualizam o requerido naquela localidade, bem como desconhecem seu atual paradeiro.\n\nDiante do exposto, as diligências restaram infrutíferas, não sendo obtidos elementos que permitam, até o presente momento, a localização do procurado."

        [CENÁRIO 6: NUMERAL NÃO LOCALIZADO / TELEFONE SEM RESPOSTA]
        "Em cumprimento à determinação para localização de [NOME_DO_ALVO], esta equipe diligenciou ao endereço informado: [ENDEREÇO].\n\nNo local, não foi possível identificar o numeral informado, inexistindo a numeração indicada na referida via.\n\nAlém disso, foram realizadas diversas tentativas de contato telefônico, contudo, as chamadas foram sistematicamente encerradas ou não atendidas.\n\nDessa forma, [O/A] alvo não foi localizado(a) até o presente momento, permanecendo as diligências em andamento."

        [CENÁRIO 7: PRISÃO EFETUADA (SUCESSO)]
        "Em cumprimento ao mandado de prisão em desfavor de [NOME_DO_ALVO], diligenciamos ao endereço [ENDEREÇO]. No local, logramos êxito em localizar o alvo. Após confirmação da identidade, foi dada voz de prisão, sendo o capturado conduzido a esta Unidade Policial para as providências cabíveis. O uso de algemas foi necessário para garantir a integridade física da equipe e do detido, conforme Súmula Vinculante 11."

        ---
        ## DADOS REAIS DO CASO (LEIA O CRIME COM ATENÇÃO):
        ALVO: ${warrantData.name}
        CRIME: ${warrantData.crime} (ATENÇÃO: Este é o crime real do mandado)
        PROCESSO: ${warrantData.number}
        ENDEREÇO: ${warrantData.location}
        
        RELATO DO AGENTE:
        "${rawContent}"

        INSTRUÇÃO: "${instructions || 'Seguir manual e adaptar crime.'}"

        ## TAREFA:
        1. Identifique o CENÁRIO correto base nos fatos.
        2. Substitua [TIPO_DE_MANDADO] por "Mandado de Prisão" (Criminal) ou "Mandado de Prisão Civil" (Pensão), conforme o campo CRIME.
        3. Substitua [CRIME_OU_NATUREZA] pelo nome do crime real.
        4. Gere o texto final.
        
        RESPOSTA:
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
        return parseGeminiJSON(resultText, null);
    } catch (error) {
        console.error("Erro na análise da IA:", error);
        return null;
    }
}


export async function analyzeDocumentStrategy(warrantData: any, docText: string) {
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        VOCÊ É UM ANALISTA DE INTELIGÊNCIA CRIMINAL DE ELITE.
        SUA MISSÃO: Realizar uma varredura profunda ("Deep Dive") no documento fornecido, cruzando-o com os dados do alvo.

        DADOS CONHECIDOS DO ALVO:
        ${JSON.stringify(warrantData, null, 2)}

        CONTEÚDO DO NOVO DOCUMENTO (OCR/EXTRAÇÃO):
        "${docText}"

        DIRETRIZES DE PENSAMENTO (CHAIN OF THOUGHT):
        1. PARENTESCOS E VÍNCULOS: Quem são as pessoas citadas? (Mãe, Advogado, Comparsa).
        2. CHECKLIST TÁTICO: O que o policial deve fazer AGORA com essa informação? (Ex: "Verificar endereço tal", "Pesquisar placa tal").
        3. RISCO: Qual o tom do documento? (Ameaça, Porte de Arma, Violência).
        4. RESUMO: O que esse documento traz de novo?

        SAÍDA OBRIGATÓRIA EM JSON (SEM MARKDOWN):
        {
            "summary": "Resumo executivo de 2 linhas.",
            "riskLevel": "Baixo" | "Médio" | "Alto" | "Crítico",
            "riskReason": "Justificativa curta do risco.",
            "entities": [
                { "name": "Nome da Pessoa", "role": "Mãe/Advogado/Comparsa", "context": "Citado como residente no endereço X" }
            ],
            "checklist": [
                { "task": "Ação sugerida curta", "priority": "Alta" | "Normal" }
            ],
            "locations": [
                { "address": "Endereço encontrado", "context": "Local de trabalho antigo" }
            ]
        }
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return parseGeminiJSON(text, null);
    } catch (error) {
        console.error("Erro na Análise Profunda:", error);
        return null;
    }
}


export async function askAssistantStrategy(warrantData: any, docContext: string, question: string, history: { role: string, content: string }[]) {
    if (!(await isGeminiEnabled())) return "IA indisponível.";

    const historyText = history.map(h => `${h.role === 'user' ? 'PERGUNTA' : 'RESPOSTA'}: ${h.content}`).join('\n');

    const prompt = `
        VOCÊ É UM ASSISTENTE DE ELITE DA POLÍCIA CIVIL.
        
        CONTEXTO DO ALVO:
        ${JSON.stringify(warrantData, null, 2)}

        CONTEXTO DO DOCUMENTO ANALISADO (SE HOUVER):
        "${docContext || 'Nenhum documento específico carregado agora. Use apenas os dados do alvo.'}"

        HISTÓRICO DA CONVERSA:
        ${historyText}

        PERGUNTA ATUAL DO AGENTE:
        "${question}"

        SUA MISSÃO:
        Responder com precisão tática, usando os dados fornecidos. 
        Se a pergunta for sobre o documento, cite onde está a informação.
        Se for sobre o alvo, use o contexto geral.
        
        ESTILO:
        Curto, direto, militar, profissional. Sem enrolação.
    `;

    try {
        return await tryGenerateContent(prompt);
    } catch (error: any) {
        console.error("Erro no Chat IA:", error);
        return "Erro ao processar resposta.";
    }
}

export async function mergeIntelligence(
    warrantData: any,
    currentIntel: any,
    newAnalysis: any
) {
    if (!(await isGeminiEnabled())) return currentIntel;

    const prompt = `
        VOCÊ É UM GERENTE DE INTELIGÊNCIA POLICIAL. (MINDSET: "HANDLER")
        SUA MISSÃO: Fundir uma nova análise tática com o dossiê de inteligência existente de um alvo.

        DADOS DO ALVO:
        ${JSON.stringify({ name: warrantData.name, crime: warrantData.crime }, null, 2)}

        🧠 INTELIGÊNCIA ATUAL (O QUE JÁ SABEMOS):
        ${JSON.stringify(currentIntel, null, 2)}

        📝 NOVA ANÁLISE (O QUE ACABOU DE CHEGAR):
        ${JSON.stringify(newAnalysis, null, 2)}

        DIRETRIZES DE FUSÃO (CRÍTICO):
        1. CONTRADIÇÕES: Se a nova informação desmente a antiga, ATUALIZE e explique na hipótese.
        2. DEDUPLICAÇÃO: Não repita endereços ou nomes (use match difuso). Se for o mesmo, enriqueça o contexto.
        3. EVOLUÇÃO: Se uma hipótese antiga foi reforçada, aumente a confiança. Se foi refutada, mude status.
        4. LIMPEZA: Remova "Próximos Passos" que já foram implicitamente feitos ou ficaram obsoletos.
        5. PROGRESSO: Estime o quanto avançamos na localização (0-100%).

        SAÍDA OBRIGATÓRIA EM JSON (ESTRUTURA RÍGIDA - TacticalIntelligence):
        {
            "summary": "Resumo consolidado em texto corrido (máx 5 linhas).",
            "timeline": [ // Mantenha os eventos antigos relevantes e adicione o novo evento da análise
                { "date": "YYYY-MM-DD", "event": "Descrição curta do fato", "source": "Origem (ex: Ifood, Relatório)" }
            ],
            "locations": [ // Lista atualizada e mergeada
                { "address": "Endereço", "context": "Contexto detalhado", "priority": "Alta/Média/Baixa", "status": "Pendente/Verificado/Descartado" }
            ],
            "entities": [ // Lista atualizada e mergeada
                { "name": "Nome", "role": "Mãe/Advogado", "context": "Detalhe do vínculo" }
            ],
            "risks": ["Risco 1", "Risco 2"], // Lista atualizada
            "hypotheses": [ // Hipóteses ativas sobre onde o alvo está
                { "description": "Hipótese de localização", "confidence": "Alta/Média/Baixa", "status": "Ativa/Refutada" }
            ],
            "suggestions": ["Sugestão tática 1", "Sugestão 2"],
            "checklist": [ // O que fazer AGORA
                { "task": "Ação concreta", "priority": "Alta/Normal", "status": "Pendente", "checked": false }
            ],
            "progressLevel": 50 // Número 0 a 100
        }
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return parseGeminiJSON(text, currentIntel);
    } catch (error) {
        console.error("Erro no Merge de Inteligência:", error);
        // Fallback: Retorna o atual + dados novos de forma bruta se falhar
        return {
            ...currentIntel,
            summary: (currentIntel.summary || '') + '\n[FALHA NA FUSÃO IA] ' + (newAnalysis.summary || ''),
            locations: [...(currentIntel.locations || []), ...(newAnalysis.locations || [])],
            lastUpdate: new Date().toISOString()
        };
    }
}

