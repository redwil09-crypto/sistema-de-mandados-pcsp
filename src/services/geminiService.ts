
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
        const model = (await genAI()).getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Você é um Investigador de Polícia da DIG (Delegacia de Investigações Gerais) de Jacareí/SP, especialista em redação técnica e jurídica.
            Sua missão é transformar um relato bruto de diligências em um CORPO de RELATÓRIO DE INVESTIGAÇÃO POLICIAL elegante, formal e direto.

            DADOS E HISTÓRICO BRUTO:
            "${rawContent}"

            REGRAS DE OURO (LEIA COM ATENÇÃO):
            1. PROIBIDO usar cabeçalhos técnicos como "--- INFORMAÇÕES DE CAMPO ---", "OBSERVAÇÕES" ou "DILIGÊNCIAS:". 
            2. INTEGRE todas as informações (histórico, observações e dados do mandado) em um texto ÚNICO e FLUIDO.
            3. Use o "estilo DIG Jacareí" (Formal, Jurídico e Profissional): 
               - "Em cumprimento ao mandado expedido nos autos do processo nº..."
               - "Esta equipe procedeu às diligências encetadas no endereço..."
               - "Restaram infrutíferas as buscas no local..."
               - "Foi franqueado o acesso ao imóvel pela Sra. (...)"
            4. Se o endereço for em outra cidade, destaque que não pertence à circunscrição mas que as buscas foram tentadas ou sistemas consultados.
            5. NÃO use marcadores (bullets) ou listas, a menos que seja para enumerar endereços específicos verificados. Prefira parágrafos bem estruturados.
            6. Se houver comandos extras do policial, integre-os: "${instructions || 'Formalize o texto.'}"
            7. Retorne APENAS o texto do corpo do relatório, pronto para o PDF.

            EXEMPLO DE TOM DESEJADO:
            "Em cumprimento ao mandado expedido nos autos do processo nº (...), esta equipe diligenciou ao endereço (...). No local, constatou-se que o imóvel apresenta sinais de desocupação, com placas de locação, não sendo possível estabelecer contato com moradores. Em pesquisas complementares aos sistemas policiais, verificou-se que o réu (...)"
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
