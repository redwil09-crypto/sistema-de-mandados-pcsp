
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabase } from "../supabaseClient";

let cachedGlobalKey: string | null = null;

const fetchGlobalKey = async () => {
    if (cachedGlobalKey) return cachedGlobalKey;
    try {
        const { data, error } = await supabase
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
    // FORCE HARDCODED KEY to avoid invalid keys in localStorage/Env
    return "AIzaSyAy4egv1X54dvbM7wtWI9xvAkHPTpa8NOM";
};

export const isGeminiEnabled = async () => {
    return true; // Sempre true pois temos chave hardcoded
};

const genAI = async () => {
    let key = await getGeminiKey();

    // Garantia final
    if (!key) key = "AIzaSyAy4egv1X54dvbM7wtWI9xvAkHPTpa8NOM";

    return new GoogleGenerativeAI(key);
};



export async function analyzeRawDiligence(warrantData: any, rawInfo: string) {
    if (!(await isGeminiEnabled())) return null;

    try {
        const genAIInstance = await genAI();
        // Standardizing on 2.5-flash
        const model = genAIInstance.getGenerativeModel({
            model: "gemini-2.0-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Erro no Gemini (Análise Bruta):", error);
        return "Erro ao processar análise de inteligência.";
    }
}

export async function generateReportBody(warrantData: any, rawContent: string, instructions: string): Promise<string> {
    try {
        if (!(await isGeminiEnabled())) {
            console.warn("DEBUG GEMINI: AI not enabled");
            return "Erro: IA não habilitada ou sem chave.";
        }

        const genAIInstance = await genAI();
        const model = genAIInstance.getGenerativeModel({
            model: "gemini-2.0-flash",
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        });

        const prompt = `
            ATUE COMO: Escrivão de Polícia Elite da DIG (Delegacia de Investigações Gerais) de Jacareí/SP.
            
            OBJETIVO: REESCREVER e CORRIGIR o Relatório de Investigação abaixo com base nas estritas ordens do Delegado (Usuário).

            ==================== DADOS DO CASO ====================
            ${rawContent || "Sem dados de diligência fornecidos."}
            =======================================================

            ORDEM PRIORITÁRIA DO DELEGADO (USUÁRIO):
            "${instructions ? instructions.toUpperCase() : 'REVISAR E FORMALIZAR O TEXTO.'}"

            REGRAS DE EXECUÇÃO:
            1. OBEDIÊNCIA TOTAL: Se o delegado pediu para mudar, mudar. Se pediu para encurtar, encurte. Se pediu para mudar o tom, mude.
            2. NÃO SE PRENDA AO TEXTO ATUAL: O texto atual é apenas um rascunho. Você DEVE melhorá-lo.
            3. DADOS OBRIGATÓRIOS:
               - Mantenha as DATAS e LOCAIS citados no Histórico.
               - Se for OUTRA CIDADE: Sugira encaminhamento (Carta Precatória).
            4. ESTILO: Formal, Impessoal, Jurídico.

            SAÍDA:
            Apenas o novo texto do corpo do relatório.
        `;

        console.log("DEBUG GEMINI: Prompt Sent:", prompt.substring(0, 100) + "...");

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("DEBUG GEMINI: Raw Response received:", text ? text.substring(0, 50) + "..." : "EMPTY");

        if (!text) return "Erro: A IA retornou uma resposta vazia.";

        // Simple cleanup, avoiding aggressive regex
        return text.trim();

    } catch (error: any) {
        console.error("DEBUG GEMINI: Fatal Error in generateReportBody:", error);
        return `Erro ao processar: ${error.message}`;
    }
}


export async function analyzeWarrantData(text: string) {
    if (!(await isGeminiEnabled())) return null;

    try {
        const genAIInstance = await genAI();
        // Standardizing on 2.5-flash
        const model = genAIInstance.getGenerativeModel({ model: "gemini-2.0-flash" });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Robust regex to clean markdown code blocks
        const jsonStr = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Erro na análise da IA:", error);
        return null;
    }
}
