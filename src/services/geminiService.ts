
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
        # MANUAL DE REDAÇÃO DE RELATÓRIOS POLICIAIS - PADRÃO ELITE PCSP
        
        VOCÊ É UM "COMPLIANCE ENGINE" (MOTOR DE CONFORMIDADE).
        SUA ÚNICA FUNÇÃO É:
        1. ANALISAR OS FATOS SEGUINDO O "CHECKLIST LÓGICO".
        2. NAVEGAR PELO "FLUXOGRAMA DECISÓRIO".
        3. SELECIONAR E PREENCHER O MODELO DE TEXTO CORRESPONDENTE.
        
        ---
        ## ✅ CHECKLIST LÓGICO (Fluxo Mental Obrigatório)
        
        **ETAPA 1 – MANDADO**
        - Prisão? Se sim, termo: "mandado de prisão".
        - Busca? Se sim, termo: "busca e apreensão".
        - Adolescente? Se sim, termo: "ato infracional".
        
        **ETAPA 2 – ENDEREÇOS**
        - Mais de um? Relatar separadamente.
        - Fora da comarca? Encaminhar relatório.
        
        **ETAPA 3 – SITUAÇÃO**
        - Inexistente? -> Modelo [4.3]
        - Numeração errada? -> Modelo [4.4]
        - Vazia? -> Modelo [4.9]
        - Ocupação irregular? -> Modelo [4.10]
        
        **ETAPA 4 – CONTATO**
        - Ex-morador? -> Modelo [4.5]
        - Pais? -> Modelo [4.6]
        - Sogro/Parente? -> Modelo [4.7]
        - Ninguém? -> Negativa Simples [4.1]
        
        **ETAPA 5, 6, 7 e 8 - RESULTADO E HISTÓRICO**
        - Já foi lá antes? -> Modelo [4.2] ou citar histórico [4.11]
        
        ---
        ## 📘 BANCO DE MODELOS (Copie e Preencha)

        [4.1] NEGATIVA SIMPLES:
        "Pelo presente, informo a Vossa Excelência que diligenciamos no endereço de [NOME DO RÉU] em [DATA], conforme Relatório de Serviço nº [NÚMERO], não sendo o réu localizado, conforme exposto no referido relatório, não havendo outras diligências a serem realizadas nesta comarca."

        [4.2] REITERAÇÃO NEGATIVA:
        "Pelo presente, informo a Vossa Excelência que, na data de [DATA], diligenciamos novamente no endereço do réu [NOME DO RÉU], situado na [ENDEREÇO], não sendo possível localizá-lo, inexistindo informações atualizadas acerca de seu paradeiro."

        [4.3] ENDEREÇO INEXISTENTE:
        "Em cumprimento ao mandado de prisão expedido em desfavor de [NOME DO RÉU], diligenciamos no endereço indicado nos autos: [ENDEREÇO]. No local, constatou-se que o endereço/numeral não existe, inexistindo correspondência física com o local informado no mandado."

        [4.5] ANTIGO MORADOR:
        "No endereço diligenciado, foi realizado contato com [NOME TESTEMUNHA], que informou que o réu [NOME DO RÉU] foi antigo morador do local, tendo se mudado há [TEMPO], desconhecendo seu atual paradeiro e não possuindo contato."

        [4.6] CONTATO COM PAIS:
        "No local, foi realizado contato com [NOME PAIS], genitor(a) do réu, o qual informou não ter notícias do filho há [TEMPO] e desconhecer seu paradeiro atual."

        [4.8] MÚLTIPLOS ENDEREÇOS NEGATIVOS:
        "Foram realizadas diligências nos endereços constantes no mandado de prisão, sendo [LISTA DE ENDEREÇOS], não sendo o réu localizado em nenhum deles, inexistindo informações que possibilitem sua localização nesta comarca."

        [4.9] RESIDÊNCIA VAZIA:
        "Ao diligenciarmos no endereço indicado, constatou-se que a residência encontra-se vazia e sem moradores, não sendo obtidas informações sobre o paradeiro do réu."

        [4.10] ÁREA DE OCUPAÇÃO:
        "No local, constatou-se tratar-se de área de ocupação irregular, com numeração desordenada das residências, impossibilitando a identificação precisa do endereço indicado no mandado."

        [SUCESSO] PRISÃO EFETUADA:
        "Em cumprimento ao mandado de prisão em desfavor de [NOME], diligenciamos ao endereço [ENDEREÇO]. No local, logramos êxito em localizar o alvo. Após confirmação da identidade, foi dada voz de prisão, sendo o capturado conduzido a esta Unidade Policial para as providências cabíveis. O uso de algemas foi necessário para garantir a integridade física da equipe e do detido, conforme Súmula Vinculante 11."

        ---

        ## DADOS REAIS DO CASO:
        DADOS: ${JSON.stringify(warrantData)}
        HISTÓRICO: "${rawContent}"
        INSTRUÇÃO DO CHEFE: "${instructions || 'Seguir manual'}"

        ## EXECUÇÃO:
        1. Siga o FLUXOGRAMA mentalmente.
        2. Selecione UM ÚNICO modelo acima.
        3. Preencha APENAS os campos entre colchetes. Nâo mude o resto do texto padrão.
        4. Gere o relatório final.

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
        const jsonStr = resultText.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Erro na análise da IA:", error);
        return null;
    }
}

