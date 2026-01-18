
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
        // User requested Gemini 3.0 Pro, switching to latest 2.0 experimental model which is the smartest available.
        const model = (await genAI()).getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `
            ATUE COMO: Escrivão de Polícia Elite da DIG (Delegacia de Investigações Gerais) de Jacareí/SP.
            TAREFA: Redigir o "Corpo do Relatório de Investigação" (Diligência de Captura) para um processo judicial.

            DADOS COMPLETOS DO CASO:
            ${rawContent}

            INSTRUÇÕES CRÍTICAS (PARA NÃO FALHAR):
            1. JURISDIÇÃO (REGRAS DE FERRO):
               - A DIG atua APENAS em Jacareí/SP.
               - SE o endereço for OUTRA CIDADE: O texto DEVE dizer que "o endereço não pertence à circunscrição de Jacareí" e SUGERIR "encaminhamento da ordem (Carta Precatória/Ofício)". NÃO diga que a equipe foi lá.
            2. LEITURA OBRIGATÓRIA:
               - Você PRECISA citar as DATAS e FATOS do "Histórico de Diligências".
               - Você PRECISA incluir as "Observações Adicionais".
            3. ESTILO (CLONE ESTES EXEMPLOS):
               - CASO PADRÃO (Não achou ninguém):
                 "Em cumprimento ao mandado expedido nos autos do processo nº (...), esta equipe diligenciou ao endereço (...). No local, em diversas ocasiões, imóvel fechado, sem atendimento. Vizinhos relataram que desconhecem o paradeiro do réu. Pesquisas nos sistemas também restaram negativas."
               - CASO "MUDOU-SE" (Mãe/Familiares atenderam):
                 "No local, a equipe foi atendida por familiares (ou moradores), que informaram que o alvo NÃO reside mais ali há longo lapso temporal e não mantêm contato. Foi franqueado acesso, nada ilícito localizado."
               - CASO "OUTRA CIDADE":
                 "Em cumprimento ao solicitado, verifica-se que o endereço (...) situa-se em outra comarca, fora da circunscrição desta DIG de Jacareí. Sugere-se o encaminhamento à delegacia local."
            4. NUNCA INVENTE DADOS.
            5. Retorne APENAS o texto do corpo do relatório.
            6. INSTRUÇÃO EXTRA DO USUÁRIO: "${instructions || 'Seguir os modelos acima.'}"
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
