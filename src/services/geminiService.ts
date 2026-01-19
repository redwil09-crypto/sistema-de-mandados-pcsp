
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

const genAI = async () => {
    const key = await getGeminiKey();
    if (!key) throw new Error("API Key do Gemini não encontrada. Configure-a no seu Perfil.");
    return new GoogleGenerativeAI(key);
};

// Helper to attempt generation with fallback models
async function tryGenerateContent(prompt: string, options: any = {}): Promise<string> {
    const genAIInstance = await genAI();
    const errors: string[] = [];

    for (const modelName of MODELS_TO_TRY) {
        try {
            console.log(`DEBUG GEMINI: Tentando modelo ${modelName}...`);
            const model = genAIInstance.getGenerativeModel({
                model: modelName,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ],
                ...options
            });

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (text) return text;

        } catch (error: any) {
            const msg = `[${modelName}]: ${error.message}`;
            console.warn(`DEBUG GEMINI: ${msg}`);
            errors.push(msg);

            // Critical auth errors - stop trying
            if (
                error.message.includes("403") ||
                error.message.includes("API key") ||
                error.message.includes("expired") ||
                error.message.includes("INVALID_ARGUMENT")
            ) {
                throw new Error("Sua Chave de API expirou ou é inválida. Por favor, gere uma nova chave no Google AI Studio e atualize no seu Perfil.");
            }
        }
    }

    // If we got here, all models failed
    console.error("DEBUG GEMINI: Todos os modelos falharam.", errors);
    throw new Error(`Falha em todos os modelos. Detalhes: ${errors.map(e => e.split(':')[0] + ' ' + (e.includes('404') ? '(404)' : '(Erro)')).join(', ')}`);
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
        # PAPEL: Escrivão de Polícia de Elite da DIG de Jacareí/SP (Polícia Civil de São Paulo).
        # MISSÃO: Redigir um Relatório de Investigação Policial impecável, formal, técnico e detalhado.
        
        # EXEMPLO DE ESTILO ESPERADO (FEW-SHOT):
        "RELATÓRIO DE INVESTIGAÇÃO POLICIAL
        
        Cumpre informar que, em atenção à Ordem de Serviço da Autoridade Policial, esta equipe de capturas da DIG de Jacareí/SP realizou diligências táticas visando a localização do alvo [NOME] (RG [RG]).
        
        Diligenciamos inicialmente no endereço cadastrado [ENDEREÇO], onde realizamos vigilância discreta. Durante o período, observamos a movimentação compatível com informes de inteligência anteriores.
        
        Em ato contínuo, logramos êxito em identificar o alvo no momento em que este deixava a residência. Procedemos com a abordagem técnica, garantindo a incolumidade de todos os envolvidos. Após a confirmação da identidade, foi dada voz de prisão em virtude do mandado nº [NÚMERO] expedido pela Vara Criminal de [VARA].
        
        O detento foi conduzido a esta unidade policial para as providências de praxe. Nada mais a declarar."

        # INSUMOS (DADOS REAIS DO CASO ATUAL):
        ${rawContent || "Atenção: Nenhum dado de diligência foi fornecido. Informe isso no texto."}

        # ORDEM DE COMANDO ADICIONAL (DO DELEGADO):
        "${instructions ? instructions.toUpperCase() : 'ELABORAR RELATÓRIO TÉCNICO PADRÃO PCSP.'}"

        # PROCESSO DE PENSAMENTO (CoT):
        1. Analise cronologicamente todas as diligências fornecidas no histórico.
        2. Verifique se há contradições ou lacunas nos dados do alvo.
        3. Identifique o desfecho (êxito na captura, localização de novo endereço, etc).
        4. Redija o texto conectando os fatos de forma fluida, em parágrafos narrativos.
        5. Use linguagem jurídica culta ("Logramos êxito", "Em ato contínuo", "Vigilância velada", "Incolumidade").

        # REGRAS ABSOLUTAS:
        1. FIDELIDADE AOS DADOS: Use apenas as placas, nomes, endereços e datas fornecidos nos insumos.
        2. FORMALIDADE: Texto impessoal e extremamente profissional.
        3. SAÍDA: Apenas o corpo do texto do relatório, pronto para uso.

        SAÍDA ESPERADA:
        Texto do relatório formatado conforme o padrão elite da PCSP.
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

