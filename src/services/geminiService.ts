
import { GoogleGenerativeAI } from "@google/generative-ai";
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
    // Prioridade 1: LocalStorage (Chave pessoal)
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey) return localKey;

    // Prioridade 2: Variável de ambiente (Build time)
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey) return envKey;

    // Prioridade 3: Banco de dados (Compartilhada)
    return await fetchGlobalKey();
};

export const isGeminiEnabled = async () => {
    const key = await getGeminiKey();
    return !!key;
};

const genAI = async () => {
    const key = await getGeminiKey();
    if (!key) throw new Error("Chave API do Gemini não configurada.");
    return new GoogleGenerativeAI(key);
};



export async function analyzeRawDiligence(warrantData: any, rawInfo: string) {
    if (!(await isGeminiEnabled())) return null;

    try {
        // Usando o modelo mais avançado disponível para análise profunda
        const model = (await genAI()).getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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

export async function generateReportBody(warrantData: any, rawContent: string, instructions: string) {
    if (!(await isGeminiEnabled())) return null;

    try {
        // User requested Gemini 1.5 Pro explicitly
        const model = (await genAI()).getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
            ATUE COMO: Escrivão de Polícia Elite da DIG (Delegacia de Investigações Gerais) de Jacareí/SP.
            TAREFA: Redigir o "Corpo do Relatório de Investigação" (Diligência de Captura) para um processo judicial.

            DADOS COMPLETOS DO CASO:
            ${rawContent}

            INSTRUÇÕES CRÍTICAS (PARA NÃO FALHAR):
            1. JURISDIÇÃO (IMPORTANTE): A DIG atua APENAS em Jacareí/SP.
               - SE o endereço do alvo for em OUTRA CIDADE (ex: São José dos Campos, Santa Branca, São Paulo, etc.):
                 O relatório DEVE APENAS informar que o endereço não pertence à circunscrição de Jacareí e SUGERIR o encaminhamento do mandado (Carta Precatória/Ofício) para a autoridade policial daquela localidade. NÃO diga que a equipe foi ao local, a menos que o histórico diga explicitamente.
            2. VOCÊ É OBRIGADO A LER E INCLUIR NO TEXTO CADA DATA E CADA FATO do "Histórico de Diligências". Não ignore nada.
            3. Se houver "Observações Adicionais", elas são cruciais. Integre-as no contexto narrativo.
            4. Estilo: Formal, Jurídico-Policial, Impessoal (sempre "Esta equipe", "Diligenciou-se").
            5. ESTRUTURA DO TEXTO:
               - Parágrafo 1: Intro (Em cumprimento ao mandado nº... processo... alvo...).
               - Parágrafo 2: Desenvolvimento (Narra as diligências ou a constatação de endereço fora da área).
               - Parágrafo 3: Conclusão (O resultado final ou sugestão de envio para outra comarca).
            6. NÃO INVENTE DADOS. Use estritamente o que foi fornecido acima. Se não tiver dados suficientes, diga que "não constam registros detalhados".
            7. IGNORE tags markdown. Retorne apenas o texto corrido.
            8. INSTRUÇÃO EXTRA DO USUÁRIO: "${instructions || 'Fazer relatório padrão completo.'}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim().replace(/^(Corpo do Relatório|Texto):/i, '');
    } catch (error) {
        console.error("Erro ao gerar corpo do relatório:", error);
        return null;
    }
}


export async function analyzeWarrantData(text: string) {
    if (!(await isGeminiEnabled())) return null;

    try {
        const model = (await genAI()).getGenerativeModel({ model: "gemini-1.5-flash" });

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
        const jsonStr = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Erro na análise da IA:", error);
        return null;
    }
}
