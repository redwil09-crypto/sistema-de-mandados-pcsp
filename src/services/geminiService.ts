
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
    // 1. Try Environment Variable FIRST (Priority for the correct/paid key)
    const envKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();
    if (envKey && envKey.length > 20) return envKey;

    // 2. Try Local Storage (User Profile)
    const localKey = localStorage.getItem('gemini_api_key');
    if (localKey && localKey.trim().length > 10) return localKey.trim();

    // 3. Try Supabase Global Settings
    const globalKey = await fetchGlobalKey();
    if (globalKey) return globalKey.trim();

    return "";
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

const generateContentWithImageViaFetch = async (model: string, prompt: string, base64Image: string, mimeType: string, key: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    }
                ]
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

    throw new Error("Resposta da IA (Imagem) vazia ou inválida.");
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

        // Ordem de preferência - Priorizando o 2.5 Flash conforme solicitado
        const preference = [
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-thinking-exp-01-21",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        // Tenta achar o melhor
        for (const pref of preference) {
            if (availableParams.includes(pref)) return pref;
        }

        const anyGemini = availableParams.find((n: string) => n.includes("gemini"));
        return anyGemini || "gemini-1.5-flash";

    } catch (e) {
        return "gemini-1.5-flash";
    }
};

async function tryGenerateContent(prompt: string, options: any = {}): Promise<string> {
    const key = await getGeminiKey();
    if (!key) throw new Error("Chave API não encontrada. Configure no Perfil.");

    const modelName = await getBestAvailableModel(key);
    console.log(`DEBUG GEMINI: Usando modelo: ${modelName}`);

    try {
        const text = await generateContentViaFetch(modelName, prompt, key);
        if (text) return text;
    } catch (error: any) {
        console.error(`DEBUG GEMINI Error (${modelName}):`, error);

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
            throw new Error(`Erro de Acesso (${modelName}): Chave API inválida ou sem permissão. Detalhe: ${msg}`);
        }
        if (msg.includes("503") || msg.includes("overloaded") || msg.includes("exhausted")) {
            throw new Error(`IA Sobrecarregada (${modelName}): Tente novamente em alguns segundos. Detalhe: ${msg}`);
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

/**
 * ESPECIALISTA EM EXTRAÇÃO - AGENTE DE ELITE
 * Esta função analisa o texto bruto do PDF e extrai TODOS os campos necessários,
 * convertendo artigos em nomes de crimes e identificando Varas/Fóruns com precisão.
 */
export async function extractFullWarrantIntelligence(rawText: string): Promise<any> {
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        VOCÊ É UM ANALISTA DE INTELIGÊNCIA DA POLÍCIA CIVIL DE ELITE.

        4. 📅 DATAS: Formate estritamente no padrão AAAA-MM-DD.

        5. 🚫 CONTRAMANDADOS / REVOGAÇÕES / SUSPENSÕES:
           - SE O DOCUMENTO FOR UM "CONTRAMANDADO", "ALVARÁ DE SOLTURA", "REVOGAÇÃO DE PRISÃO" ou "RECOLHIMENTO DE MANDADO":
             * O CAMPO "type" DEVE SER "CONTRAMANDADO DE PRISÃO".
             * O CAMPO "regime" DEVE SER "Contramandado".
             * O CAMPO "status" DEVE SER "CUMPRIDO".
           
           - SE O DOCUMENTO FOR "SUSPENSÃO DE REGIME" OU "SUSPENSÃO DE PENA":
             * O CAMPO "type" DEVE SER "MANDADO DE PRISÃO".
             * O CAMPO "regime" DEVE SER "Suspensão de Regime".
             * O CAMPO "status" DEVE SER "EM ABERTO". (Não baixar, pois o réu ainda deve ser capturado/apresentado).

        TEXTO BRUTO DO MANDADO (OCR):
        """
        ${rawText}
        """

        SAÍDA OBRIGATÓRIA EM JSON (SEM COMENTÁRIOS):
        {
            "name": "NOME COMPLETO EM MAIÚSCULAS",
            "rg": "Apenas números",
            "cpf": "Apenas números",
            "birthDate": "AAAA-MM-DD",
            "processNumber": "Número do processo unificado",
            "type": "MANDADO DE PRISÃO" ou "BUSCA E APREENSÃO",
            "crime": "NOME DO CRIME TRADUZIDO (Ex: Roubo)",
            "regime": "Fechado / Semiaberto / Aberto / Preventiva / Temporária / Civil",
            "issuingCourt": "VARA E COMARCA POR EXTENSO (Ex: 1ª VARA CRIMINAL DE JACAREÍ)",
            "addresses": ["Endereço 1", "Endereço 2"],
            "issueDate": "AAAA-MM-DD",
            "expirationDate": "AAAA-MM-DD",
            "observations": "Resumo tático das observações",
            "tags": ["Urgente", "Risco de Fuga", etc]
        }
    `;

    try {
        const resultText = await tryGenerateContent(prompt);
        return parseGeminiJSON(resultText, null);
    } catch (error) {
        console.error("Erro no Especialista de Extração:", error);
        return null;
    }
}

export async function extractWarrantFromImage(base64Image: string, mimeType: string): Promise<any> {
    if (!(await isGeminiEnabled())) return null;

    const key = await getGeminiKey();
    if (!key) return null;

    // Priorize models usually good with vision
    const modelName = "gemini-1.5-flash"; // Flash is good and fast for vision

    const prompt = `
        VOCÊ É UM ANALISTA DE INTELIGÊNCIA DA POLÍCIA CIVIL DE ELITE.
        SUA MISSÃO: Analisar a IMAGEM deste MANDADO JUDICIAL (Scan ou Foto) e extrair dados estruturados com 100% de precisão tática.
        
        REGRAS DE OURO (SEM ALUCINAÇÕES):
        1. Identifique visualmente campos como VARA, PROCESSO, NOME, ENDEREÇOS.
        2. Se a imagem estiver ruim, faça o melhor possível para inferir o contexto, mas martele a precisão nos números (RG, CPF, PROCESSO).
        3. Converta Artigos (ex: 157, 33) para Nomes de Crimes (Roubo, Tráfico), igual à regra padrão.
        4. IMPORTANTE: Se o documento contiver "CONTRAMANDADO", "REVOGAÇÃO" ou a pessoa não for mais procurada, defina "type": "CONTRAMANDADO DE PRISÃO" e "regime": "Contramandado".
        
        SAÍDA OBRIGATÓRIA EM JSON (SEM COMENTÁRIOS):
        {
            "name": "NOME COMPLETO EM MAIÚSCULAS",
            "rg": "Apenas números",
            "cpf": "Apenas números",
            "birthDate": "AAAA-MM-DD",
            "processNumber": "Número do processo unificado",
            "type": "MANDADO DE PRISÃO", "BUSCA E APREENSÃO" ou "CONTRAMANDADO DE PRISÃO",
            "crime": "NOME DO CRIME TRADUZIDO (Ex: Roubo)",
            "regime": "Fechado / Semiaberto / Aberto / Preventiva / Temporária / Civil / Contramandado",
            "issuingCourt": "VARA E COMARCA POR EXTENSO",
            "addresses": ["Endereço 1", "Endereço 2"],
            "issueDate": "AAAA-MM-DD",
            "expirationDate": "AAAA-MM-DD",
            "observations": "Dados visuais adicionais (tatuagens, marcas) ou observações do texto",
            "tags": ["Urgente", "Risco de Fuga", etc],
            "status": "EM ABERTO" ou "CUMPRIDO" (Se for Contramandado)
        }
    `;

    try {
        const text = await generateContentWithImageViaFetch(modelName, prompt, base64Image, mimeType, key);
        return parseGeminiJSON(text, null);
    } catch (error) {
        console.error("Erro no Especialista de Extração por Imagem:", error);
        return null;
    }
}

export async function analyzeRawDiligence(warrantData: any, rawInfo: string) {
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        VOCÊ É UM EXPERT EM INTELIGÊNCIA POLICIAL OPERACIONAL.
        SUA MISSÃO: Analisar informes brutos de campo e estruturar uma INTELIGÊNCIA TÁTICA para o sistema.

        DADOS DO ALVO:
        ${JSON.stringify(warrantData, null, 2)}

        INFORMAÇÃO BRUTA COLETADA (DILIGÊNCIA):
        "${rawInfo}"

        DIRETRIZES DE ANÁLISE:
        1. Identifique RISCOS imediatos para a equipe.
        2. Extraia ENTIDADES (Pessoas, Veículos, Organizações).
        3. Mapeie LOCAIS citados e verifique se batem com o mandado.
        4. Crie um PLANO DE AÇÃO (Checklist) para o próximo turno.
        5. OBRIGATÓRIO: Inclua SEMPRE a tarefa "Solicitar dados plataformas (iFood/Uber/99)" com Prioridade ALTA, se ainda não feito.

        SAÍDA OBRIGATÓRIA EM JSON (SEM MARKDOWN, APENAS O JSON):
        {
            "summary": "Resumo tático direto e profissional (máx 3 linhas) para o log operacional.",
            "riskLevel": "Baixo" | "Médio" | "Alto" | "Crítico",
            "riskReason": "Motivo curto do nível de risco (ex: 'Alvo armado', 'Fuga provável').",
            "entities": [
                { "name": "Nome", "role": "Mãe/Comparsa/Vizinho", "context": "Onde aparece na história" }
            ],
            "locations": [
                { "address": "Endereço citado", "context": "Casa da namorada/Esconderijo", "priority": "Alta/Média" }
            ],
            "checklist": [
                { "task": "Ação sugerida (ex: Pesquisar placa ABC-1234)", "priority": "Alta/Normal", "status": "Pendente", "checked": false }
            ],
            "hypotheses": [
                { "description": "Hipótese de localização (ex: Está escondido na casa da mãe)", "confidence": "Alta/Média/Baixa", "status": "Ativa" }
            ]
        }
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return parseGeminiJSON(text, null);
    } catch (error: any) {
        console.error("Erro no Gemini (Análise Estruturada):", error);
        return null;
    }
}

export async function generateReportBody(warrantData: any, rawContent: string, instructions: string): Promise<string> {
    if (!(await isGeminiEnabled())) {
        return "Erro: IA não habilitada ou sem chave.";
    }

    const prompt = `
        # MANUAL DE REDAÇÃO DO ESCRIVÃO DE POLÍCIA DE ELITE (PADRÃO PCSP)

        VOCÊ É UM ESCRIVÃO DE POLÍCIA DE ELITE, ESPECIALISTA EM REDAÇÃO JURÍDICA E RELATÓRIOS ESTRATÉGICOS.
        SUA MISSÃO: Analisar o contexto operacional e redigir o corpo de um RELATÓRIO DE CAPTURAS impecável.

        ---
        ## RACIOCÍNIO INTERNO (THINKING STEP):
        1. Analise o CRIME: Se for Art. 244 ou Pensão -> TIPO = "Mandado de Prisão Civil". Caso contrário -> TIPO = "Mandado de Prisão".
        2. Analise o RELATO: O alvo foi preso? O endereço estava vazio? Alguém atendeu?
        3. Escolha o CENÁRIO correspondente abaixo.
        4. Adapte Nomes, Datas, Endereços e Crimes.

        ---
        ## 📂 BANCO DE CENÁRIOS (MODELOS DE ELITE)

        [CENÁRIO 1: ENDEREÇO EM OUTRA COMARCA]
        "Em cumprimento ao [TIPO_DE_MANDADO] expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], referente ao delito de [CRIME_OU_NATUREZA], esta equipe procedeu a diligências e pesquisas visando à localização de [NOME_DO_ALVO].\n\nContudo, após minuciosa análise dos sistemas de inteligência policial (CORTEX, IIRGD, PRODESP), constatou-se que o réu não possui registros residenciais ou vínculos ativos nesta Comarca de Jacareí/SP. No texto da referida ordem judicial, consta como endereço de referência o imóvel situado na [ENDEREÇO_DO_MANDADO].\n\nDiante da ausência de elementos que indiquem a presença do procurado nesta circunscrição, sugere-se a remessa do presente expediente à autoridade policial daquela Comarca, para as providências de estilo.\n\nAté o momento, as diligências restaram negativas."

        [CENÁRIO 2: CONTATO COM MÃE/FAMILIAR - NÃO MORA MAIS]
        "Em cumprimento ao [TIPO_DE_MANDADO] (Processo nº [NÚMERO_DO_PROCESSO]), oriundo da [VARA], esta equipe dirigiu-se ao endereço situado na [ENDEREÇO_DILIGENCIADO], apontado como reduto do procurado [NOME_DO_ALVO].\n\nNo local, fomos atendidos pela Sra. [NOME_DA_PESSOA_ATENDIDA] (RG: [RG]), genitora/familiar do réu, a qual declarou sob as penas da lei que o mesmo não reside no imóvel há considerável lapso temporal, desconhecendo seu atual paradeiro e afirmando não manter contato com o mesmo.\n\nApós a devida ciência sobre a ordem judicial, foi franqueada a entrada no imóvel, sendo realizada varredura tática em todos os cômodos, restando infrutífera a localização do alvo. Pesquisas de campo com populares lindeiros também não forneceram novos indícios.\n\nDiante do exposto, o resultado da diligência permanece negativo."

        [CENÁRIO 3: COMERCIAL / DESCONHECIDO NO LOCAL]
        "Atendendo à determinação judicial para cumprimento de [TIPO_DE_MANDADO] em desfavor de [NOME_DO_ALVO] (Processo [NÚMERO_DO_PROCESSO]), esta equipe deslocou-se ao endereço: [ENDEREÇO].\n\nConstatou-se tratar-se de estabelecimento comercial. Em entrevista com o responsável pelo local, Sr. [NOME_QUEM_ATENDEU], este afirmou desconhecer o réu, asseverando que o mesmo jamais trabalhou ou frequentou o referido imóvel. Pesquisas complementares no logradouro não apontaram vínculos do alvo com o endereço.\n\nPelo que, permanecem negativas as diligências de captura."

        [CENÁRIO 4: IMÓVEL VAZIO / ALUGA-SE]
        "Em diligência visando o cumprimento de [TIPO_DE_MANDADO] contra [NOME_DO_ALVO], referente ao crime de [CRIME], esta equipe compareceu ao endereço [ENDEREÇO].\n\nIn loco, observou-se que o imóvel encontra-se desabitado, com visíveis sinais de abandono e ostentando placas de 'Aluga-se/Vende-se'. Vizinhos consultados informaram que o imóvel está vazio há meses, não sabendo precisar o paradeiro dos antigos moradores.\n\nAssim, encerram-se as diligências no local sem a localização do executado."

        [CENÁRIO 5: IFOOD / INTELIGÊNCIA DE DADOS]
        "Em análise de inteligência tática cruzada com dados de consumo (iFood/Apps), identificou-se movimentação recente do procurado [NOME_DO_ALVO] no endereço: [ENDEREÇO].\n\nEsta equipe realizou vigilância velada no local, contudo, o alvo não foi visualizado no período. Informes de inteligência sugerem que o réu utiliza o local apenas como ponto de recebimento de encomendas, mantendo-se em local incerto no período noturno.\n\nDiligências prosseguem para neutralizar o alvo em momento oportuno."

        [CENÁRIO 6: PRISÃO EFETUADA (SUCESSO)]
        "Em cumprimento ao [TIPO_DE_MANDADO] expedido nos autos do Processo nº [NÚMERO_DO_PROCESSO] pela [VARA], esta equipe de Capturas da DIG Jacareí deslocou-se ao endereço [ENDEREÇO], onde, após vigilância tática, logrou êxito na visualização do procurado [NOME_DO_ALVO].\n\nEfetuada a abordagem policial, o alvo foi cientificado da ordem judicial em seu desfavor. Após a confirmação da identidade, foi dada voz de prisão. O capturado foi conduzido a esta Unidade Policial para as formalidades legais, sendo resguardada sua integridade física. O uso de algemas foi empregado conforme os ditames da Súmula Vinculante nº 11/STF, visando à segurança da equipe e evitar tentativa de fuga.\n\nMandado devidamente cumprido."

        ---
        ## DADOS DO CASO:
        NOME DO ALVO: ${warrantData.name}
        CRIME NO MANDADO: ${warrantData.crime} (FUNDAMENTAL PARA O TEXTO)
        PROCESSO: ${warrantData.number}
        VARA: ${warrantData.issuingCourt || 'Vara Criminal'}
        TIPO DE CRIME/REGIME: ${warrantData.category || 'Criminal'} / ${warrantData.regime || 'Total'}
        
        RELATO DO AGENTE:
        "${rawContent}"

        INSTRUÇÕES EXTRAS: "${instructions}"

        ## RESULTADO ESPERADO:
        Gere APENAS o texto final do relatório, sem comentários. Use linguagem de delegacia, profissional e austera.
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
        6. GARANTIA: Se não houver a tarefa "Solicitar dados plataformas (iFood/Uber/99)", ADICIONE-A com prioridade ALTA.

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


export async function adaptDocumentToTarget(warrantData: any, templateText: string) {
    if (!(await isGeminiEnabled())) return "Erro: IA não habilitada ou sem chave.";

    const prompt = `
        VOCÊ É UM ESCRIVÃO DE POLÍCIA DE ELITE (AGENTE ESPECIALISTA IFOOD).
        
        SUA MISSÃO:
        1. Ler o "MODELO/TEXTO BASE" abaixo (que pode conter dados de OUTRA pessoa ou lugares genéricos).
        2. REESCREVER o documento INTEIRO, substituindo TODAS as informações variáveis pelos DADOS DO NOVO ALVO informado abaixo.
        3. Preservar estritamente o tom formal, jurídico e institucional.
        4. Onde não houver dado no sistema para preencher um campo do modelo (ex: nome da mãe, telefone), OMITE O CAMPO ou use "NÃO INFORMADO" de forma discreta, MAS NÃO INVENTE DADOS.

        DADOS DO NOVO ALVO (USAR ESTES):
         Nome: ${warrantData.name}
         RG: ${warrantData.rg || 'Não informado'}
         CPF: ${warrantData.cpf || 'Não informado'}
         Endereço: ${warrantData.location || 'Não informado'}
         Crime: ${warrantData.crime || 'Não informado'}
         Processo: ${warrantData.number || 'Não informado'}
         Vara/Fórum: ${warrantData.issuingCourt || 'Não informado'}
         Filiação: ${warrantData.motherName || 'Não informado'}

        MODELO/TEXTO BASE (IGNORAR OS DADOS PESSOAIS DAQUI, USAR APENAS A ESTRUTURA):
        """
        ${templateText}
        """

        RESPOSTA (APENAS O TEXTO DO DOCUMENTO REVISADO, SEM COMENTÁRIOS):
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return text.trim();
    } catch (error: any) {
        console.error("Erro na Adaptação de Documento:", error);
        return `Erro ao processar documento: ${error.message}`;
    }
}
