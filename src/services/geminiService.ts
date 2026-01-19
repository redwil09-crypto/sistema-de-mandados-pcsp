
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabase } from "../supabaseClient";

let cachedGlobalKey: string | null = null;
const MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-001", "gemini-pro"];

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
    let lastError: any = null;

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
            console.warn(`DEBUG GEMINI: Falha com ${modelName}:`, error.message);
            lastError = error;
            // If it's a safety block, maybe trying another model helps, or maybe not. 
            // If it's 404 or 429, definitely try next.
            if (error.message.includes("403") || error.message.includes("API key")) {
                // If key is invalid, no point trying other models
                throw error;
            }
        }
    }

    throw lastError || new Error("Falha ao gerar conteúdo com todos os modelos disponíveis.");
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
        # PAPEL: Escrivão de Polícia Elite da DIG de Jacareí/SP (Polícia Civil de São Paulo).
        # MISSÃO: Redigir um Relatório de Investigação Policial impecável, formal e detalhado.

        # INSUMOS (DADOS REAIS DO CASO):
        ${rawContent || "Atenção: Nenhum dado de diligência foi fornecido. Informe isso."}

        # ORDEM DE COMANDO (DO DELEGADO):
        "${instructions ? instructions.toUpperCase() : 'ELABORAR RELATÓRIO TÉCNICO PADRÃO.'}"

        # PROCESSO DE PENSAMENTO (CoT):
        1. Analise cronologicamente todas as diligências fornecidas no histórico.
        2. Verifique se há contradições ou lacunas.
        3. Identifique o resultado final (êxito, frustração, parcial).
        4. Redija o texto conectando os fatos de forma fluida, sem tópicos, usando linguagem jurídica culta (ex: "Em ato contínuo", "Diligenciamos", "Logramos êxito").

        # REGRAS ABSOLUTAS:
        1. USE OS DADOS FORNECIDOS: Não invente fatos. Se o histórico diz que foi no dia 20, foi no dia 20.
        2. ESTILO: Texto corrido (parágrafos), impessoal, técnico. Evite gírias.
        3. FORMATAÇÃO: Padrão de ofício da PCSP.
        4. OBJETIVO: O texto deve estar pronto para assinatura do Delegado.

        SAÍDA ESPERADA:
        Apenas o corpo do texto do relatório, formatado e revisado.
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

