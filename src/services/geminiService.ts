
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

export async function analyzeWarrantData(text: string) {
    if (!(await isGeminiEnabled())) return null;

    try {
        const model = (await genAI()).getGenerativeModel({ model: "gemini-1.5-flash" });

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
    if (!(await isGeminiEnabled())) return null;

    try {
        const model = (await genAI()).getGenerativeModel({ model: "gemini-1.5-flash" });

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
            Você é um Investigador de Polícia da DIG (Delegacia de Investigações Gerais) de Jacareí/SP, altamente experiente na redação de relatórios de diligências.
            Sua missão é redigir o CORPO de um RELATÓRIO DE INVESTIGAÇÃO POLICIAL formal, utilizando os dados do mandado e o relato de campo fornecido.

            DADOS DO MANDADO:
            Nome do Alvo: ${warrantData.name}
            Processo nº: ${warrantData.number}
            RG: ${warrantData.rg || 'Não informado'}
            CPF: ${warrantData.cpf || 'Não informado'}
            Natureza/Crime: ${warrantData.crime || 'Não informado'}
            Vara: ${warrantData.court || 'Jacareí/SP'}

            RELATO BRUTO DAS DILIGÊNCIAS (LINHA DO TEMPO E OBSERVAÇÕES):
            "${rawContent}"

            INSTRUÇÕES ESPECÍFICAS DO POLICIAL:
            "${instructions || 'Formalize o relatório seguindo o padrão da unidade.'}"

            ESTILO E EXEMPLOS DE REFERÊNCIA (Siga este tom e estrutura):
            - Para Mandados de Outra Cidade: "Esclarece-se que tal endereço encontra-se sob a competência territorial da (...) –, sendo, portanto, de atribuição daquela unidade policial as providências..."
            - Para Diligências Negativas (Geral): "Foram realizadas verificações in loco em dias e horários diversos, ocasião em que se constatou ausência de sinais de habitação ou qualquer indício de presença recente do procurado no imóvel."
            - Para Contato com Familiares: "Ao chegar ao local, os policiais foram atendidos por (...), o qual relatou que o alvo não reside mais no endereço... foi franqueado o acesso ao imóvel, sendo realizada busca em todos os cômodos..."
            - Para Imóveis com Placas: "Constatando-se que o imóvel encontra-se com placas de 'aluga-se' e 'vende-se', sem qualquer movimentação que indicasse ocupação regular."

            REGRAS CRÍTICAS:
            1. NÃO invente nomes de policiais ou fatos que não estejam no relato bruto.
            2. Se no relato bruto disser que o imóvel estava vazio, use termos como "ausência de sinais de habitação".
            3. Use uma linguagem técnica policial: "in loco", "diligências encetadas", "proferiu palavras no sentido de", "franqueado o acesso", "restaram infrutíferas".
            4. Se for pensão alimentícia (Prisão Civil), foque na busca por endereços ativos e vínculos locais.
            5. O texto final deve ser coeso, sem repetições desnecessárias, e pronto para ser impresso em papel timbrado.
            6. Retorne APENAS o texto do corpo do relatório, sem comentários.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Erro ao gerar corpo do relatório:", error);
        return null;
    }
}

