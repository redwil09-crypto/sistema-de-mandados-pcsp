
import { GoogleGenerativeAI } from "@google/generative-ai";

const getGeminiKey = () => {
    return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const isGeminiEnabled = () => {
    return !!getGeminiKey();
};

const genAI = () => {
    const key = getGeminiKey();
    if (!key) throw new Error("Chave API do Gemini não configurada.");
    return new GoogleGenerativeAI(key);
};

export async function analyzeWarrantData(text: string) {
    if (!isGeminiEnabled()) return null;

    try {
        const model = genAI().getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Você é um analista de inteligência da Polícia Civil do Estado de São Paulo.
            Sua tarefa é analisar o seguinte texto extraído de um mandado judicial ou relatório policial e extrair informações críticas.
            
            TEXTO:
            "${text}"
            
            Retorne APENAS um objeto JSON com o seguinte formato:
            {
                "summary": "Um resumo tático de 3 a 5 frases focado em informações de risco e localização.",
                "periculosidade": "Nível (Baixo, Médio, Alto, Crítico) baseado em antecedentes ou comportamento citado.",
                "warnings": ["Lista de alertas de segurança como 'Resistência provável', 'Porte de arma', etc"],
                "routine_hints": "Dicas sobre horários ou locais de frequência citados no texto.",
                "possible_relatives": ["Nomes de parentes ou comparsas citados"]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonText = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Erro no Gemini:", error);
        return null;
    }
}

export async function findIntelligenceLinks(targetName: string, allWarrantsText: string) {
    if (!isGeminiEnabled()) return null;

    try {
        const model = genAI().getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Com base no nome do alvo "${targetName}" e no banco de dados de mandados resumido abaixo,
            identifique conexões indiretas (mesmo endereço, mesmos sobrenomes, menções em observações).
            
            BANCO DE DADOS:
            "${allWarrantsText}"
            
            Retorne um array JSON de objetos:
            [{ "target": "Nome do Relacionado", "type": "Tipo de Vínculo", "description": "Explicação curta" }]
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonText = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Erro no Gemini:", error);
        return [];
    }
}
