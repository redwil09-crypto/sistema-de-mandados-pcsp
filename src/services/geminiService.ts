
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabase } from "../supabaseClient";

let cachedGlobalKey: string | null = null;
const MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-pro"
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

        // Ordem de preferência - Priorizando estabilidade
        const preference = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-2.0-flash-exp",
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
            "issuingCourt": "NOME COMPLETO DA VARA E COMARCA",
            "addresses": ["Endereço 1", "Endereço 2", "etc - SEPARAR EM MÚLTIPLOS ITENS SE HOUVER MAIS DE UM, NUNCA CONCATENAR EM UMA SÓ STRING"],
            "issueDate": "AAAA-MM-DD",
            "expirationDate": "AAAA-MM-DD",
            "observations": "Resumo tático das observações. FOQUE se há restrições de saúde, se o alvo é perigoso, ou do crime organizado.",
            "tags": ["Gerar tags táticas se presentes. Exemplos: 'Alta Periculosidade', 'Crime Organizado / Facção', 'Pena Definitiva', 'Alvo Reincidente', 'Alerta: Violência Doméstica', 'Possível Confronto Armado (P.C.A.)', 'Rompimento de Tornozeleira', 'Ofício de Cobrança']
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
            "issuingCourt": "NOME COMPLETO DA VARA E COMARCA",
            "addresses": ["Endereço 1", "Endereço 2", "etc - SEPARAR EM MÚLTIPLOS ITENS SE HOUVER MAIS DE UM, NUNCA CONCATENAR EM UMA SÓ STRING"],
            "issueDate": "AAAA-MM-DD",
            "expirationDate": "AAAA-MM-DD",
            "observations": "Dados visuais adicionais (tatuagens, marcas) ou observações do texto. Preste ESPECIAL atenção se o réu é perigoso, do crime organizado, ou tem pena alta.",
            "tags": ["Gerar tags táticas. Use EXATAMENTE estas se aplicável: 'Alta Periculosidade', 'Crime Organizado / Facção', 'Pena Definitiva', 'Alvo Reincidente', 'Alerta: Violência Doméstica', 'Possível Confronto Armado (P.C.A.)', 'Rompimento de Tornozeleira', 'Ofício de Cobrança'],
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
            "summary": "Resumo tático direto e profissional (máx 3 linhas) para o log operacional. Se a pesquisa (ex: iFood) retornou NEGATIVA, cite formalmente que o alvo não possui vínculo com a referida plataforma.",
            "riskLevel": "Baixo" | "Médio" | "Alto" | "Crítico",
            "riskReason": "Motivo curto do nível de risco (ex: 'Alvo armado', 'Fuga provável'). Se for apenas pesquisa negativa, coloque risco Baixo.",
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
        
        CRÍTICO: Mesmo se a informação indicar que NÃO ACHOU NADA (zero vínculos no iFood, alvo não cadastrado, etc), DEVOLVA O JSON ESTRUTURADO dizendo no summary que "A pesquisa na plataforma X retornou resultados negativos, alvo sem vínculos ativos.". JAMAIS retorne vazio ou fora do formato JSON.
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

        [CENÁRIO 1: ENDEREÇO EM OUTRA COMARCA / RETORNO DE PLATAFORMA FORA DA CIDADE]
        "Em cumprimento ao [TIPO_DE_MANDADO] expedido nos autos do processo nº [NÚMERO_DO_PROCESSO], referente ao delito de [CRIME_OU_NATUREZA], esta equipe procedeu a diligências e pesquisas visando à localização de [NOME_DO_ALVO].\n\nNo decurso das investigações, através do levantamento de inteligência e cruzamento com dados de plataformas (iFood, Uber, etc.), constatou-se que o réu não possui endereços ativos e frequentados nesta Comarca de Jacareí/SP. Os últimos registros confiáveis apontam movimentação do alvo na cidade/região de [NOME_DA_CIDADE_DE_DESTINO, ex: São Paulo, Guarulhos, São José dos Campos].\n\nConsiderando a competência territorial, sugere-se a remessa do presente expediente à autoridade policial daquela localidade para as providências de captura logísticas cabíveis, uma vez que esta equipe atua exclusivamente nesta municipalidade.\n\nAté o momento, as diligências de campo em solo restaram negativas."

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
        DADOS DE PLATAFORMA (iFood/Uber etc - Use para cruzar endereços!):
        "${warrantData.ifoodResult || 'Nenhum dado de plataforma registrado ainda.'}"
        
        RELATO DO AGENTE:
        "${rawContent}"

        INSTRUÇÕES EXTRAS: "${instructions}"

        ## RESULTADO ESPERADO:
        Gere APENAS o texto final do relatório, sem comentários. 
        MUITO IMPORTANTE: Use um tom HUMANIZADO e PROFISSIONAL. Evite "juridiquês" excessivo. Escreva como um policial que está relatando os fatos reais: "fomos atendidos por fulano", "conversamos com vizinhos", "foi franqueada a entrada". 
        PRIORIDADE MÁXIMA: Se o usuário der uma instrução de refinamento, ignore o rascunho anterior e reescreva focado totalmente no que ele pediu e nos modelos de exemplo acima.
        REGRA DE FORMATAÇÃO: Sempre envolva o NOME DO RÉU e o NÚMERO DO PROCESSO em **asteriscos duplos** (ex: **JOÃO DA SILVA**, **12345-67.2024**) para que fiquem em negrito no relatório final.
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

export interface CaptureFormData {
    captureDate: string;
    captureTime: string;
    captureLocation: string;
    captureNeighborhood: string;
    teamMembers: string;
    circumstances: string;
    resistedArrest: boolean;
    usedHandcuffs: boolean;
    seizedItems: string;
    witnessName: string;
    boNumber: string;
    delegatePresiding: string;
    additionalNotes: string;
}

export async function generateCaptureCommunication(warrantData: any, captureData: CaptureFormData | string) {
    if (!(await isGeminiEnabled())) return "IA indisponível. Cadastre a API Key nas configurações.";

    // Backward compatibility: if string is passed, convert to structured format
    const structured: CaptureFormData = typeof captureData === 'string' 
        ? {
            captureDate: new Date().toISOString().split('T')[0],
            captureTime: '',
            captureLocation: '',
            captureNeighborhood: '',
            teamMembers: '',
            circumstances: captureData,
            resistedArrest: false,
            usedHandcuffs: true,
            seizedItems: '',
            witnessName: '',
            boNumber: '',
            delegatePresiding: 'Dr. Luiz Antonio Cunha Dos Santos',
            additionalNotes: ''
        }
        : captureData;

    const isMinor = (warrantData.type || '').toLowerCase().includes('menores') || 
                    (warrantData.type || '').toLowerCase().includes('adolescente') ||
                    (warrantData.type || '').toLowerCase().includes('ato infracional') ||
                    (warrantData.type || '').toLowerCase().includes('apreensão');
    
    const isSearchWarrant = (warrantData.type || '').toLowerCase().includes('busca') ||
                            (warrantData.type || '').toLowerCase().includes('apreensão de objeto');

    const prompt = `
# SUPER AGENTE ESCRIVÃO - DELEGACIA DE INVESTIGAÇÕES GERAIS DE JACAREÍ (DIG/PCSP)
VOCÊ É O ESCRIVÃO MAIS EXPERIENTE DA POLÍCIA CIVIL DE SÃO PAULO.
SUA MISSÃO: Redigir o REGISTRO DE CAPTURA / APREENSÃO no estilo EXATO de Boletim de Ocorrência (B.O.) da DIG de Jacareí.

IMPORTANTE: Você NÃO escreve ofícios formais ao juiz. Você escreve REGISTROS POLICIAIS no estilo B.O. direto, objetivo, sem "Vossa Excelência", sem fecho formal.

---
## DADOS DO MANDADO (do sistema):
- Nome: ${warrantData.name}
- RG: ${warrantData.rg || ''}
- CPF: ${warrantData.cpf || ''}
- Processo nº: ${warrantData.number}
- Vara/Comarca: ${warrantData.issuingCourt || ''}
- Data Expedição Mandado: ${warrantData.issueDate || ''}
- Validade: ${warrantData.expirationDate || ''}
- Crime/Infração: ${warrantData.crime || ''}
- Regime: ${warrantData.regime || ''}
- Tipo: ${warrantData.type || ''}
- Endereço Cadastrado: ${warrantData.location || ''}

## DADOS DA CAPTURA (informados pelo policial):
- Data: ${structured.captureDate || 'hoje'}
- Hora: ${structured.captureTime || ''}
- Local da captura: ${structured.captureLocation || ''}
- Bairro: ${structured.captureNeighborhood || ''}
- Equipe: ${structured.teamMembers || ''}
- Circunstâncias: "${structured.circumstances || ''}"
- Resistiu: ${structured.resistedArrest ? 'SIM' : 'NÃO'}
- Algemas: ${structured.usedHandcuffs ? 'SIM' : 'NÃO'}
- Objetos apreendidos: ${structured.seizedItems || ''}
- Familiar notificado: ${structured.witnessName || ''}
- B.O. nº: ${structured.boNumber || ''}
- Delegado: ${structured.delegatePresiding || ''}
- Observações: ${structured.additionalNotes || ''}

---
## ESTILO OBRIGATÓRIO - APRENDA COM ESTES EXEMPLOS REAIS:

### EXEMPLO 1 - Captura Fechado (se apresentou):
"Registra-se o presente para dar cumprimento ao Mandado de Prisão expedido em 29/09/2021, pela 1ª Vara Criminal da comarca de Jacareí, Processo nº0000114-09.2015.8.26.0617, em desfavor de **Maria Aparecida da Silva**, relativo ao crime de homicídio qualificado, sendo certo que Maria Aparecida, após tomar conhecimento de que policiais desta DIG estiveram em sua residência, aqui se apresentou espontaneamente, a qual foi conduzida ao Centro de Triagem de Santa Branca onde permanecerá à disposição da Justiça, sendo-lhe requisitado exame de corpo de delito cautelar. Nada mais."

### EXEMPLO 2 - Captura Semiaberto (abordagem policial):
"Presente os policiais civis Ademir e William conduzindo o indiciado identificado como **BRENO FUJARRA**, contra quem existe um Mandado de Prisão, em regime semiaberto, expedido dia 26/03/2024 pelo Juízo de Direito da 1ª Vara Criminal de Jacareí/SP - Processo nº **0004009-41.2019.8.26.0292**, relativo ao Art.16 único, IV da Lei 10.826/03, os quais lograram êxito em deter após abordagem policial pelo local dos fatos. Ato seguinte, o mesmo foi apresentado nesta Unidade Policial para as providências de polícia judiciária. Por fim, a autoridade policial determinou as comunicações necessárias e a expedição da requisição de exame de corpo de delito cautelar. O indiciado foi conduzido ao Centro de Triagem de Jacareí, onde permanecerá à disposição da Justiça e será submetido a audiência de custódia do dia seguinte."

### EXEMPLO 3 - Captura Fechado (diligência):
"Presentes os policiais civis supra qualificados desta especializada, informando que na manhã de hoje realizaram diligências na Rua Benedito das Chagas e Silva, nº 32 - Jardim Alvorada, Jacareí/SP, onde conseguiram localizar **RONALDO DE ALMEIDA SANT'ANA**, contra quem havia um Mandado de Prisão expedido pela 1ª Vara Criminal de Jacareí/SP, Processo nº **1503688-29.2019.8.26.0292**, em 25/10/2023, com validade até 19/10/2044, referente ao Art. 157 do Código Penal. Após o registro digital da ocorrência e das requisições de praxe, o implicado foi encaminhado ao Centro de Triagem de Jacareí, onde permanecerá à disposição da Justiça. Foi requisitado exame de corpo de delito cautelar, e ele será submetido a audiência de custódia. Sua mãe, Sra. Elisabeth Alves dos Santos, foi notificada sobre a prisão."

### EXEMPLO 4 - Regime Aberto:
"Presentes os policiais supra qualificados para dar cumprimento ao Mandado de Prisão – regime aberto, expedido em 12/03/2025 pela 1ª Vara Criminal de Jacareí/SP, Processo nº **0005143-30.2024.8.26.0292**, com validade até 21/07/2028, em desfavor de **HUGO CESAR DOS SANTOS SILVA**, residente na Estrada dos Paturis, nº 520, Estância Porto Velho, Jacareí/SP. Por fim, após o registro digital da ocorrência e das requisições de praxe, o implicado foi encaminhado ao Centro de Triagem de Jacareí, onde permanecerá à disposição da Justiça. Foi requisitado exame de corpo de delito cautelar, e ele será submetido à audiência de custódia. Seu pai, Niltol Cesar da Silva, foi cientificado acerca da prisão."

### EXEMPLO 5 - Aberto com advogado:
"Presentes os policiais supra qualificados para dar cumprimento ao Mandado de Prisão, regime aberto, expedido em 22/03/2023 pela 1ª Vara Criminal de Jacareí/SP, Processo nº **0001622-82.2021.8.26.0292**, com validade até 05/07/2024, em desfavor de **ALEXANDRA DE BRITO DE MORAES**, relativo ao Art. 184, §2 do CP. O advogado constituído, Dr. Roberli da Costa Machado, OAB 217396, prontificou-se a acompanhá-la. Após o registro digital da ocorrência e das requisições de praxe, a detida foi conduzida ao Centro de Triagem de Caçapava, onde permanecerá à disposição da Justiça. Foi-lhe requisitado exame de corpo de delito cautelar e será submetida a audiência de custódia."

### EXEMPLO 6 - Pensão alimentícia:
"Presentes os policiais civis supra qualificados desta especializada, informando que na tarde de hoje realizaram diligências até Rua José Vicente, 155, Residencial Santa Paula, Jacareí/SP, local dos fatos, onde conseguiram localizar e deter **JEFFERSON DE MORAES SOUSA**, contra quem havia um Mandado de Prisão - Civil, expedido pela 2ª Vara Família e Sucessões de Jacareí/SP, Processo nº **0002739-40.2023.8.26.0292**, expedido em 17/12/2024, com validade até 17/12/2026, referente ao inadimplemento de pensão alimentícia, com prazo de prisão de 30 dias. Posteriormente à detenção, Jefferson foi apresentado nesta Unidade Policial para a formalização das providências de polícia judiciária. Em conformidade com os trâmites legais, a autoridade policial instruiu as comunicações permitidas e o exame de corpo de delito cautelar. O detido foi conduzido ao Centro de Triagem de Jacareí, onde ficará à disposição da Justiça e será apresentado em audiência de custódia. Sua companheira Sra. Tainá Rodrigues foi notificada quanto a prisão."

### EXEMPLO 7 - Ligou para se entregar:
"Registra-se o presente para dar cumprimento ao Mandado de Prisão - Prisão Civil, expedido em 24/02/2023, com validade até 16/01/2025, pela 1ª Vara de Família e Sucessões da Comarca de Jacareí, Processo nº **0009044-079.2019.8.26.0292**, em desfavor de **FELIPE FERNANDO DAS CHAGAS SILVA**, relativo à pensão alimentícia, prazo de 30 dias. Narra policial civil Giuliano, componente do setor de capturas dessa especializada, que recebeu ligação do suposto procurado FELIPE manifestando o desejo de se entregar. Diante das informações rumou até o endereço indicado e, após confirmar sua identidade como procurado pela Justiça devido à questão de pensão alimentícia o conduziu até esta especializada, onde, a autoridade policial determinou o presente registro. O implicado foi recolhido ao Centro de Triagem de Jacareí e permanecerá à disposição da Justiça, sendo-lhe requisitado exame de corpo de delito cautelar. Nada Mais."

### EXEMPLO 8 - Adolescente (Busca e Apreensão):
"Registra-se o presente para dar cumprimento ao Mandado de Busca e Apreensão expedido em 30/8/2023, pelo Juízo de Direito da 2ª Vara Criminal (Anexo da Infância e Juventude de Jacareí/SP) - Processo nº **1501223-08.2023.8.26.0292**, em desfavor do adolescente **FERNANDO HENRIQUE PEREIRA**, a medida socioeducativa de SEMILIBERDADE, relativo a ato infracional análogo Tráfico de Drogas, Fernando foi conduzido à Fundação CASA Serra da Mantiqueira em São José dos Campos/SP, onde permanecerá à disposição da Justiça, requisitando-lhe exame de corpo de delito cautelar. Nada mais."

### EXEMPLO 9 - Adolescente já maior de idade:
"Registra-se o presente para dar cumprimento ao Mandado de Busca e Apreensão do Adolescente **MATHEUS BEZERRA DE SA CRUZ**, expedido pela 2ª Vara Criminal de Jacareí (Anexo da Infância e Juventude) em 07/02/2022, Processo nº **1500490-13.2021.8.26.0292**, referente a Ato Infracional análogo à Tráfico de Drogas. Registrou-se o presente como Captura de Procurado e não como apreensão de adolescente, haja vista que o implicado atingiu a maioridade penal em 13/12/2021 e o sistema RDO não aceita a inclusão de apreensão de adolescente quando o implicado já apresenta 18 anos de idade. Autoridade Policial determinou a recolha do mesmo, o qual foi encaminhado à Fundação CASA - Serra da Mantiqueira, em São José dos Campos, onde permanecerá à disposição da Justiça, requisitou-se exame de corpo de delito cautelar. Nada mais."

### EXEMPLO 10 - Foi cumprido na cadeia:
"Presente o Policial Civil William C. A. Castro informando que nesta data aportou nesta Especializada o Mandado de Prisão Semiaberto expedido em 25/01/2022, com validade até 17/11/2029, pela 2ª Vara Criminal de Jacareí em desfavor de **JOHN LENNON ALCANTARA DA SILVA** - Proc. n°**1501068-10.2020.8.26.0292** - relativo aos Crimes do Sistema Nacional de Armas (Art. 16, § 1 do Estatuto do Desarmamento - Lei 10826/03), onde referido policial se deslocou até o Centro de Triagem de Jacareí, onde JOHN LENNON está recolhido, e lá foi dado cumprimento a mencionada ordem de prisão. Nada Mais."

### EXEMPLO 11 - Regime aberto (fórum):
"Registra-se o presente para dar cumprimento ao Mandado de Prisão, regime aberto, expedido em 05/11/2021, pela 1ª Vara Criminal de Jacareí/SP, Processo nº**1501330-52.2020.8.26.0617**, com validade até 01/06/2024, em desfavor de **MICHELE CRISTINA PEREIRA FLORINDO**. Tratando-se de ordem prisional em regime aberto, após o registro digital da ocorrência e das requisições, apresente-se a capturada no fórum local para as providências legais quanto ao início do cumprimento de sua pena, onde sua advogada constituída Dra. Rosângela, prontificou-se em acompanhá-la."

### EXEMPLO 12 - Dois mandados:
"Elabora-se o presente a fim de se registrar o cumprimento de dois mandados de prisão expedidos em desfavor do capturado, sendo um oriundo do processo n°**1500322-06.2021.8.26.0617** da 1ª Vara Criminal da Comarca de Jacareí/SP, expedido em 11/09/2021, com validade até 27/06/2025 onde consta condenação de 1 ano, 6 meses e 20 dias em regime inicial aberto, relativo ao crime de Roubo, e outro Mandado de Prisão PREVENTIVA processo nº**1500436-47-2021.2021.8.26.0292**, da 1° Vara Criminal desta Comarca, expedido em 30/11/2021, com validade até 25/11/2037, relativo crime de ROUBO. Mandados cumpridos por essa especializada. O implicado foi conduzido ao Centro de Triagem de Jacareí onde permanecerá à disposição da Justiça, sendo-lhe requisitado exame de corpo de delito cautelar. Nada mais."

---
## REGRAS ABSOLUTAS (INVIOLÁVEIS):

1. IMITE FIELMENTE o estilo dos exemplos acima. É um REGISTRO POLICIAL (B.O.), NÃO um ofício formal.
2. NUNCA use "Vossa Excelência", "Egrégio Juízo", "protestos de estima e consideração" - isso NÃO existe neste estilo.
3. Sempre termine com "Nada mais.", "Nada Mais." ou similar.
4. Use "sendo-lhe requisitado exame de corpo de delito cautelar" (frase obrigatória).
5. Use "será submetido a audiência de custódia" quando aplicável.
6. Use "Centro de Triagem de Jacareí" para adultos / "Fundação CASA - Serra da Mantiqueira em São José dos Campos" para adolescentes.
7. Quando familiar for notificado, inclua: "Sua mãe/esposa/pai, Sra./Sr. [NOME], foi notificada(o)/cientificada(o) sobre a prisão."
8. Adapte gênero (a/o, conduzida/conduzido, detida/detido, a implicada/o implicado).
9. NUNCA invente dados. Se algo não foi informado, OMITA.
10. Envolva o NOME DO RÉU e o NÚMERO DO PROCESSO em **asteriscos duplos** para negrito.
11. NÃO coloque cabeçalho institucional. Comece DIRETO no corpo do registro.
12. O texto deve ser UM ou DOIS parágrafos no máximo, fluido e corrido, como nos exemplos.
13. Se regime aberto e foi ao fórum: "Tratando-se de ordem prisional em regime aberto, após o registro digital da ocorrência e das requisições, apresente-se o capturado no fórum local para as providências legais quanto ao início do cumprimento de sua pena."
14. Se se apresentou espontaneamente: "sendo certo que [NOME], após tomar conhecimento de que policiais desta DIG estiveram em sua residência, aqui se apresentou espontaneamente"
15. Sempre use "após o registro digital da ocorrência e das requisições de praxe" como frase de transição.

RETORNE APENAS O TEXTO DO REGISTRO, SEM COMENTÁRIOS SEUS, SEM EXPLICAÇÕES, SEM TÍTULO.
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return text.trim();
    } catch (error: any) {
        console.error("Erro no Super Agente Escrivão:", error);
        return "Erro ao redigir o comunicado: " + error.message;
    }
}


export async function analyzeWarrantData(text: string) {
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        Você é um analista de inteligência policial. 
        Analise o seguinte texto extraído de um mandado judicial ou histórico policial e extraia:
        1. Um resumo curto (máximo 2 linhas) do perigo ou modus operandi do alvo.
        2. Tags de alerta operacional EXTREMAMENTE relevantes para as equipes de rua:
           [ "Alta Periculosidade", "Crime Organizado / Facção", "Possível Confronto Armado (P.C.A.)", "Alvo Reincidente", "Alerta Psiquiátrico / Risco Misto", "Rompimento de Tornozeleira", "Histórico de Fuga", "Alerta: Violência Doméstica" ]

        TEXTO:
        "${text}"

        Responda APENAS em formato JSON:
        {
            "summary": "Resumo de 2 linhas focado no que importa pra quem vai invadir/prender",
            "warnings": ["Tag Tática 1", "Tag Tática 2"]
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

const normalizeText = (text: string): string => {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, " ")     // Keep alphanumeric only
        .replace(/\s+/g, " ")           // Single spaces
        .trim();
};

const NEIGHBORHOOD_TO_DP: { [key: string]: string } = {
    // 1º DP (SUL / LESTE - Sede: Jd. Esper)
    "cidade salvador": "01º DP",
    "novo amanhecer": "01º DP",
    "jardim novo amanhecer": "01º DP",
    "santa maria": "01º DP",
    "jardim santa maria": "01º DP",
    "santa marina": "01º DP",
    "santa paula": "01º DP",
    "rio comprido": "01º DP",
    "varadouro": "01º DP",
    "rio abaixo": "04º DP",
    "vila branca": "01º DP",
    "jardim luiza": "01º DP",
    "jardim do marques": "01º DP",
    "jardim coleginho": "01º DP",
    "vila nova alianca": "01º DP",
    "cerejeira": "01º DP",
    "guanabara": "01º DP",
    "jardim guanabara": "01º DP",
    "colonial": "01º DP",
    "jardim colonial": "01º DP",
    "jardim do vale": "01º DP",
    "jardim das industrias": "01º DP",
    "altos de santana": "01º DP",
    "jardim paraiso": "01º DP",
    "maria amelia": "01º DP",
    "jardim dora": "01º DP",
    "dora": "01º DP",
    "olympia": "01º DP",
    "jardim olympia": "01º DP",
    "jardim real": "01º DP",
    "pedregulho": "01º DP",
    "vila zeze": "01º DP",
    "zeze": "01º DP",
    "itamarati": "01º DP",
    "mirante do vale": "01º DP",
    "jardim yolanda": "01º DP",
    "portal": "01º DP",
    "colonia": "01º DP",
    "jardim colonia": "01º DP",
    "vila vintem": "01º DP",
    "terra de santa clara": "01º DP",
    "pitoresco": "01º DP",
    "jardim pitoresco": "01º DP",
    "principes": "01º DP",
    "parque dos principes": "01º DP",
    "santo antonio": "01º DP",
    "parque santo antonio": "01º DP",
    "boa vista": "01º DP",
    "jardim boa vista": "01º DP",
    "residencial vista das araucarias": "01º DP",
    "vista das araucarias": "01º DP",
    "jardim colinas": "01º DP",
    "colinas": "01º DP",
    "campo grande": "01º DP",
    "mato dentro": "01º DP",
    "santana do pedregulho": "01º DP",
    "jardim santana do pedregulho": "01º DP",
    "jardim santana": "01º DP",
    "jardim altos de santana": "01º DP",

    // 2º DP (OESTE - Sede: Jd. Flórida)
    "jardim florida": "02º DP",
    "bela vista": "02º DP",
    "igarapes": "02º DP",
    "sao silvestre": "02º DP",
    "pagador andrade": "04º DP",
    "cidade nova": "02º DP",
    "jacarei cidade nova": "02º DP",
    "lago dourado": "02º DP",
    "lagoinha": "04º DP",
    "condominio lagoinha": "04º DP",
    "sao luiz": "02º DP",
    "agrinco": "02º DP",
    "imperial": "02º DP",
    "jequitiba": "02º DP",
    "ijal": "02º DP",
    "iraja": "02º DP",
    "nova esperanca": "02º DP",
    "jardim nova esperanca": "02º DP",
    "sao joaquim": "04º DP",
    "esperanca": "02º DP",
    "jardim esperanca": "02º DP",
    "jardim alvorada": "04º DP",
    "baixos": "02º DP",
    "escada": "02º DP",
    "jardim siesta": "02º DP",
    "estancia porto velho": "02º DP",
    "jardim terras da conceicao": "02º DP",
    "vila machado": "02º DP",
    "panorama": "02º DP",
    "jardim panorama": "02º DP",
    "chiquinha schurig": "02º DP",
    "arice": "02º DP",
    "jardim arice": "02º DP",
    "jd arice": "02º DP",
    "sao judas": "02º DP",
    "sao judas tadeu": "02º DP",
    "vila sao judas tadeu": "02º DP",
    "jardim jacinto": "02º DP",
    "jacinto": "02º DP",
    "bandeira branca": "02º DP",
    "jardim emilia": "02º DP",
    "vila ita": "02º DP",
    "balneario paraiba": "02º DP",
    "jamic": "02º DP",
    "jardim terras de santa helena": "02º DP",
    "cidade jardim": "02º DP",
    "jardim elza maria": "02º DP",
    "jardim terras de sao joao": "02º DP",
    "parque imperial": "02º DP",
    "jardim pedra mar": "02º DP",
    "rua projetada": "02º DP",
    "conj res vinte e dois de abril": "02º DP",

    // 3º DP (CENTRO / CENTRAL - Sede: Centro)
    "centro": "03º DP",
    "jardim california": "03º DP",
    "parque california": "01º DP",
    "sao joao": "03º DP",
    "jardim paraiba": "03º DP",
    "paraiba": "03º DP",
    "vila garcia": "03º DP",
    "pinheiro": "03º DP",
    "vila pinheiro": "03º DP",
    "jardim pinheiros": "03º DP",
    "sao simao": "03º DP",
    "marilia": "03º DP",
    "brasilia": "03º DP",
    "guarani": "03º DP",
    "jardim guarani": "03º DP",
    "sao gabriel": "03º DP",
    "jardim sao gabriel": "03º DP",
    "lourdes": "03º DP",
    "jardim lourdes": "03º DP",
    "emida costa": "03º DP",
    "leonidia": "03º DP",
    "vila real": "03º DP",
    "amparo": "03º DP",
    "perreira do amparo": "03º DP",
    "avenida": "03º DP",
    "avarei": "03º DP",
    "parque brasil": "03º DP",
    "parque dos sinos": "03º DP",
    "jardim sao jose": "03º DP",
    "jardim bela vista": "03º DP",
    "jardim liberdade": "03º DP",
    "liberdade": "03º DP",
    "vila denise": "03º DP",
    "jardim leonidia": "03º DP",

    // 4º DP (NORTE / MEIA LUA - Sede: Meia Lua)
    "parque meia lua": "04º DP",
    "meia lua": "04º DP",
    "jardim meia lua": "04º DP",
    "primeiro de maio": "04º DP",
    "conjunto primeiro de maio": "04º DP",
    "lagoa azul": "04º DP",
    "remedinhos": "04º DP",
    "pagador": "04º DP",
    "andrade": "04º DP",
    "paratei": "04º DP",
    "jardim conquista": "04º DP",
    "cassununga": "04º DP",
    "chacaras rural": "04º DP",
    "rural": "04º DP"
};

const DP_SITES = [
    { id: "01º DP", lat: -23.3006, lng: -45.9525, name: "01º DP (Siqueira Campos)" },
    { id: "02º DP", lat: -23.3213, lng: -45.9717, name: "02º DP (Pensilvânia)" },
    { id: "03º DP", lat: -23.3061, lng: -45.9667, name: "03º DP (Prudente de Moraes)" },
    { id: "04º DP", lat: -23.2754, lng: -45.9255, name: "04º DP (Meia Lua)" }
];

export const inferDPRegion = async (address: string, lat?: number, lng?: number): Promise<string | null> => {
    if (!address || typeof address !== 'string') return null;

    const normalized = normalizeText(address);
    if (normalized.includes('nao informado') || normalized.includes('sem endereco')) {
        return null;
    }

    // 0. CHECK FOR OTHER CITIES AND STATES FIRST
    const rawUpper = address.toUpperCase();
    const normalizedJacarei = normalized.includes('jacarei');
    const normalizedIgarata = normalized.includes('igarata');

    // Detect Other States (e.g., - RJ, - MG, - PR)
    const stateMatch = rawUpper.match(/-\s*([A-Z]{2})\b/);
    if (stateMatch && stateMatch[1] !== 'SP' && !normalizedJacarei) {
        return 'Outras Cidades';
    }

    // List of cities that should definitely not be Jacareí (unless explicitly mentioned)
    const otherCities = [
        'SAO JOSE DOS CAMPOS', 'SÃO JOSÉ DOS CAMPOS', 'SJC', 'TAUBATE', 'CACAPAVA', 'SÃO PAULO', 'SAO PAULO',
        'GUARULHOS', 'MOGI DAS CRUZES', 'SANTA BRANCA', 'PARAIBUNA', 'CAJAMAR', 'CAMPINAS',
        'OSASCO', 'SANTO ANDRE', 'SAO BERNARDO', 'SOROCABA', 'SANTOS', 'CARAPICUIBA',
        'PIRACICABA', 'BAURU', 'FRANCA', 'LIMEIRA', 'ARARAQUARA', 'ITAQUAQUECETUBA'
    ];

    const mentionsOtherCity = otherCities.some(city => rawUpper.includes(city));

    if (mentionsOtherCity && !normalizedJacarei && !normalizedIgarata) {
        console.log(`[DP INFERENCE] Detected Other City: ${address}`);
        return 'Outras Cidades';
    }

    // 1. Check Hardcoded Map FIRST (Speed and Accuracy for known Jacareí neighborhoods)
    // We only check this if it's likely Jacareí or explicitly Jacareí.
    for (const [neighborhood, dp] of Object.entries(NEIGHBORHOOD_TO_DP)) {
        if (normalized.includes(neighborhood)) {
            console.log(`[DP INFERENCE] Match found via Map: ${neighborhood} -> ${dp}`);
            return dp;
        }
    }

    // 2. Intelligent Distance Hint & Decision (if coordinates present)
    let distanceHint = "";
    if (lat && lng) {
        const sortedDps = [...DP_SITES].sort((a, b) => {
            const distA = Math.sqrt(Math.pow(lat - a.lat, 2) + Math.pow(lng - a.lng, 2));
            const distB = Math.sqrt(Math.pow(lat - b.lat, 2) + Math.pow(lng - b.lng, 2));
            return distA - distB;
        });

        const closestDp = sortedDps[0];
        const distToClosest = Math.sqrt(Math.pow(lat - closestDp.lat, 2) + Math.pow(lng - closestDp.lng, 2));

        // Threshold of 0.18 is approx 20km. 
        // If the location is further than 20km from ALL local DPs, it's definitively NOT in Jacareí.
        if (distToClosest > 0.18) {
            console.log(`[DP INFERENCE] Geoloc distance too far (${distToClosest.toFixed(4)}): Outras Cidades`);
            return 'Outras Cidades';
        }

        distanceHint = `GEOLOCALIZAÇÃO: Este ponto está FISICAMENTE mais próximo da sede do ${closestDp.id}. Use esta informação como prioridade máxima de decisão regional.`;
    }

    // 3. Fallback to Gemini for complex addresses or unknown areas
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        VOCÊ É UM INVESTIGADOR POLICIAL EM JACAREÍ/SP, ESPECIALISTA EM JURISDIÇÃO E TERRITÓRIOS.
        SUA MISSÃO: Determinar qual Delegacia de Polícia (Região) atende prioritariamente o local fornecido.
        
        AVISO: NÃO SEJA PREGUICOSO. O ENDEREÇO E AS COORDENADAS SÃO REAIS E DEFINEM O DP.
        
        LOCAL: ${address}
        COORDENADAS: ${lat || 'Não informada'}, ${lng || 'Não informada'}
        ${distanceHint}

        DIRETRIZES TÁTICAS (JACAREÍ/SP):
        1. SE O ENDEREÇO MENCIONAR QUALQUER CIDADE DIFERENTE DE JACAREÍ OU IGARATÁ (como São José dos Campos, São Paulo, Mogi, etc.), sua resposta OBRIGATÓRIA deve ser "Outras Cidades".
        2. CASO O ENDEREÇO TENHA UM ESTADO DIFERENTE DE SP (ex: - RJ, - MG), sua resposta OBRIGATÓRIA deve ser "Outras Cidades".
        3. CASO SEJA JACAREI:
           - 1º DP: Cidade Salvador, Santa Maria, Novo Amanhecer, Vila Branca, Santa Paula, Rio Comprido, Jd. Pitoresco, Parque dos Principes, Santo Antonio, Boa Vista, Vista das Araucarias, Jardim do Marques, Jardim Coleginho, Vila Nova Alianca, Vila Zeze, Jardim Colinas, Campo Grande, Jardim Altos de Santana, Santana do Pedregulho, Jardim Dora, Jardim Colonia, Mato Dentro.
           - 2º DP: Bela Vista (Apenas Bela Vista puro), Igarapés, São Silvestre, Cidade Nova, Jd. Panorama, Rua Chiquinha Schurig, Jardim Arice (JD Arice), Vila São Judas Tadeu, Jardim Jacinto, Bandeira Branca, Jardim Emilia, Vila Ita, Balneario Paraiba, JAMIC, Terras de Santa Helena.
           - 3º DP: Centro (Estritamente Jacareí), Jd. Califórnia, São João, Didinha, Jd. Esper, Jardim Bela Vista, Parque dos Sinos, Jardim São Jose, Jardim Liberdade, Vila Denise, Jardim Leonidia, Jardim Paraíba, Paraíba.
           - 4º DP: Meia Lua, Primeiro de Maio, Lagoa Azul, Pagador Andrade, São Joaquim, Paratei, Jardim Alvorada, Lagoinha, Rio Abaixo.
        4. SE VOCÊ TIVER DÚVIDA SE O ENDEREÇO É EM JACAREÍ (Ex: apenas o nome da rua sem cidade), sua resposta OBRIGATÓRIA deve ser "Outras Cidades". NÃO INVENTE JURISDIÇÃO.

        RESPOSTA ESTRITA (APENAS UM DESSES): "1º DP", "2º DP", "3º DP", "4º DP", "Outras Cidades".
        Resposta:
    `;

    try {
        const text = await tryGenerateContent(prompt);
        const result = text.trim();

        if (result.includes("Outras") || result.includes("Cidades")) return "Outras Cidades";
        if (result.includes("DIG")) return "DIG";
        if (result.includes("DISE")) return "DISE";
        if (result.includes("DDM")) return "DDM";
        if (result.includes("4")) return "04º DP";
        if (result.includes("3")) return "03º DP";
        if (result.includes("2")) return "02º DP";
        if (result.includes("1")) return "01º DP";
        if (result.includes("Plantão") || result.includes("Plantao")) return "Plantão";

        return null;
    } catch (error) {
        console.error("Erro ao inferir Região do DP:", error);
        return null;
    }
}
