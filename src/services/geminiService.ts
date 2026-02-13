
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

// Função para descobrir dinamicamente qual modelo está disponível para esta chave
const getBestAvailableModel = async (key: string): Promise<string> => {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) return "gemini-1.5-flash"; // Fallback cego se falhar a lista

        const data = await response.json();
        if (!data.models) return "gemini-1.5-flash";

        // Filtra modelos que geram conteúdo e são da família Gemini 1.5 ou Pro
        // BLACKLIST DE SEGURANÇA: Remove modelos 2.0/2.5/Experimentais que causam erro 429/403 (Limit 0)
        const availableParams = data.models
            .filter((m: any) =>
                m.supportedGenerationMethods.includes("generateContent") &&
                !m.name.includes("2.0") &&
                !m.name.includes("2.5") &&
                !m.name.includes("exp")
            )
            .map((m: any) => m.name.replace("models/", ""));

        console.log("DEBUG GEMINI: Modelos disponíveis para esta chave:", availableParams);

        // Ordem de preferência - Priorizando ROBUSTEZ (Pro / 1.5 Pro) sobre Rapidez (Flash)
        // REMOVIDO 2.0/2.5 pois estavam instáveis
        const preference = [
            "gemini-1.5-pro",
            "gemini-1.5-pro-001",
            "gemini-1.5-pro-002",
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
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
        console.error(`DEBUG GEMINI Error (Primary ${modelName}):`, error.message);

        // FALLBACK WATERFALL: Se a robusta falhar, vai descendo o nível
        // Evita testar o mesmo modelo que já falhou
        const fallbacks = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];

        for (const fallbackModel of fallbacks) {
            if (fallbackModel === modelName) continue; // Skip failed primary

            try {
                console.log(`DEBUG GEMINI: Tentando fallback para MAIS LEVE: ${fallbackModel}...`);
                const fallbackText = await generateContentViaFetch(fallbackModel, prompt, key);
                if (fallbackText) return fallbackText;
            } catch (fallbackError: any) {
                console.warn(`DEBUG GEMINI: Fallback ${fallbackModel} falhou.`);
            }
        }

        const msg = error.message || "Erro desconhecido";
        if (msg.includes("403") || msg.includes("API_KEY")) {
            throw new Error(`Erro de Acesso: Chave API inválida.`);
        }
        throw new Error(`Falha na IA e nos fallbacks: ${msg}`);
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
        [ROLE:EXTRACTOR] [TASK:PARSE] [FMT:JSON]

        <OCR>
        "${rawText}"
        </OCR>

        <RULES>
        1. COURT(Header) -> Name+City.
        2. CRIME(Arts) -> CommonName (Ex:157->Roubo).
        3. TARGET -> Name(UP), RG/CPF(Dig), Birth(ISO).
        4. ADDR -> List.
        5. DATES -> ISO.
        </RULES>

        <JSON_SCHEMA>
        {
            "name": "STR", "rg": "STR", "cpf": "STR", "birthDate": "YYYY-MM-DD",
            "processNumber": "STR", "type": "PRISÃO|BUSCA",
            "crime": "STR", "regime": "STR",
            "issuingCourt": "STR",
            "addresses": ["STR"],
            "issueDate": "YYYY-MM-DD", "expirationDate": "YYYY-MM-DD",
            "observations": "STR", "tags": ["STR"]
        }
        </JSON_SCHEMA>
    `;

    try {
        const resultText = await tryGenerateContent(prompt);
        return parseGeminiJSON(resultText, null);
    } catch (error) {
        console.error("Erro no Especialista de Extração:", error);
        return null;
    }
}

export async function analyzeRawDiligence(warrantData: any, rawInfo: string) {
    if (!(await isGeminiEnabled())) return null;

    const prompt = `
        [ROLE:ANALYST] [TASK:DILIGENCE] [FMT:JSON]
        
        <TARGET>
        ${JSON.stringify({
        n: warrantData.name,
        c: warrantData.crime,
        l: warrantData.location,
        h: (warrantData.diligentHistory || []).map((h: any) => h.substring(0, 50)).slice(-3)
    })}
        </TARGET>

        <INPUT>
        "${rawInfo}"
        </INPUT>

        <OPS>
        1. CONFLICT_CHECK(Target, Input).
        2. RISK(Input) -> [L|M|H|C].
        3. ENTITIES(Input) -> [Name,Role].
        4. LOCS(Input) -> [Addr].
        5. ACTIONS(Input) -> List.
        </OPS>

        <JSON_SCHEMA>
        {
            "summary": "Max 3 lines",
            "riskLevel": "Low|Medium|High|Critical",
            "riskReason": "Str",
            "entities": [{"name": "Str", "role": "Str", "context": "Str"}],
            "locations": [{"address": "Str", "context": "Str"}],
            "checklist": [{"task": "Str", "priority": "Alta|Normal"}]
        }
        </JSON_SCHEMA>
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return parseGeminiJSON(text, null);
    } catch (error: any) {
        console.error("Erro no Gemini (Análise Bruta):", error);
        // Return object structure even on error to prevent UI crash
        return {
            summary: `Erro na análise IA: ${error.message}.`,
            riskLevel: "Desconhecido",
            riskReason: "Falha de processamento.",
            entities: [],
            locations: [],
            checklist: []
        };
    }
}

export async function generateReportBody(warrantData: any, rawContent: string, instructions: string): Promise<string> {
    if (!(await isGeminiEnabled())) {
        return "Erro: IA não habilitada ou sem chave.";
    }

    const prompt = `
        [ROLE:WRITER_POLICE] [TASK:GENERATE_REPORT] [CTX:PCSP_ELITE_STD]

        <CASE_DATA>
        TARGET: ${warrantData.name}
        CRIME: ${warrantData.crime} (CRITICAL: If 'Pensão/Alimentos'->Civil; Else->Criminal)
        PROC: ${warrantData.number}
        ADDR: ${warrantData.location}
        </CASE_DATA>

        <USER_INPUT>
        "${rawContent}"
        INST: "${instructions || 'Follow standard'}"
        </USER_INPUT>

        <SCENARIOS>
        1. NOT_FOUND_CITY -> Suggest transfer.
        2. MOVED_AWAY -> Family confirmed.
        3. UNKNOWN_AT_ADDR -> Resident denies knowledge.
        4. EMPTY_HOUSE -> For rent/sale.
        5. LONG_TIME_GONE -> Neighbors confirm.
        6. ADDR_NOT_EXIST -> Number not found.
        7. CAPTURED -> Success.
        </SCENARIOS>

        <INSTRUCTIONS>
        1. IDENTIFY_SCENARIO(UserInput).
        2. ADAPT_TEMPLATE(Scenario) -> Replace placeholders ([ALVO], [CRIME], etc).
        3. ADJUST_TONE(Formal, Institutional).
        </INSTRUCTIONS>

        <OUTPUT>
        Direct report text only. No markdown.
        </OUTPUT>
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
        [ROLE:INTEL_ANALYST] [TASK:SUMMARIZE_THREAT] [MODE:JSON]

        <TEXT>
        "${text}"
        </TEXT>

        <OUTPUT_FORMAT>
        {
            "summary": "Short danger/MO summary (max 2 lines)",
            "warnings": ["Dangerous", "Flight Risk", "Armed", "Domestic Violence", "Drug Trafficking"]
        }
        </OUTPUT_FORMAT>
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
        [ROLE:ANALYST] [TASK:DEEP_DOC] [FMT:JSON]

        <TGT>
        ${JSON.stringify({ n: warrantData.name, c: warrantData.crime })}
        </TGT>

        <DOC>
        "${docText}"
        </DOC>

        <OPS>
        1. RELATIONS -> Entities.
        2. LOCS -> Addrs.
        3. RISK -> Level.
        4. ACTIONS -> Checklist.
        </OPS>

        <JSON_SCHEMA>
        {
            "summary": "Max 2 lines",
            "riskLevel": "Low|Medium|High|Critical",
            "riskReason": "Str",
            "entities": [{"name": "Str", "role": "Str", "context": "Str"}],
            "checklist": [{"task": "Str", "priority": "Alta|Normal"}],
            "locations": [{"address": "Str", "context": "Str"}]
        }
        </JSON_SCHEMA>
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
        [ROLE:POLICE_ASSISTANT] [TASK:ANSWER_QUERY] [CTX:TACTICAL]

        <CTX_TARGET>
        ${JSON.stringify({ n: warrantData.name, c: warrantData.crime })}
        </CTX_TARGET>

        <CTX_DOC>
        "${docContext || 'N/A'}"
        </CTX_DOC>

        <HISTORY>
        ${historyText}
        </HISTORY>

        <QUERY>
        "${question}"
        </QUERY>

        <RULES>
        1. ANSWER_SHORT_DIRECT.
        2. USE_CONTEXT_IF_RELEVANT.
        3. STYLE_MILITARY_PROFESSIONAL.
        </RULES>
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
        [ROLE:INTEL_HANDLER] [TASK:MERGE_INTEL] [MODE:JSON_UPDATE]

        <TARGET_INFO>
        ${JSON.stringify({ n: warrantData.name })}
        </TARGET_INFO>

        <CURRENT_STATE>
        ${JSON.stringify(currentIntel)}
        </CURRENT_STATE>

        <NEW_INPUT>
        ${JSON.stringify(newAnalysis)}
        </NEW_INPUT>

        <MERGE_RULES>
        1. DEDUPLICATE(Locations, Entities) -> FuzzyMatch.
        2. UPDATE_RISK -> Max(Current, New).
        3. REFINE_HYPOTHESES -> Update Status(Active/Refuted).
        4. CLEAN_CHECKLIST -> Remove Completed.
        5. CALC_PROGRESS -> 0-100.
        </MERGE_RULES>

        <OUTPUT_FORMAT>
        {
            "summary": "...", "timeline": [...], "locations": [...],
            "entities": [...], "risks": [...], "hypotheses": [...],
            "suggestions": [...], "checklist": [...], "progressLevel": 0-100
        }
        </OUTPUT_FORMAT>
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
        [ROLE:CLERK_ELITE] [TASK:FILL_TEMPLATE] [STRICT_VARS]

        <TARGET_DATA>
        N:${warrantData.name}, RG:${warrantData.rg}, CPF:${warrantData.cpf}
        ADDR:${warrantData.location}, C:${warrantData.crime}, P:${warrantData.number}
        CT:${warrantData.issuingCourt}, M:${warrantData.motherName}
        </TARGET_DATA>

        <TEMPLATE>
        "${templateText}"
        </TEMPLATE>

        <RULES>
        1. REPLACE_ALL_VARS(Template) WITH (TargetData).
        2. IF_MISSING -> Use "NÃO INFORMADO" or OMIT.
        3. KEEP_FORMAL_TONE.
        </RULES>

        <OUTPUT>
        Final document text only.
        </OUTPUT>
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return text.trim();
    } catch (error: any) {
        console.error("Erro na Adaptação de Documento:", error);
        return `Erro ao processar documento: ${error.message}`;
    }
}

export async function batchSmartGrouping(warrants: any[]) {
    if (!(await isGeminiEnabled())) return null;

    // Minimize input data to save tokens
    const minimizedWarrants = warrants.map(w => ({
        id: w.id,
        n: w.name,
        c: w.crime,
        l: w.location,
        o: (w.observation || '').substring(0, 100)
    }));

    const prompt = `
        [ROLE:INTEL_COMMANDER] [TASK:CLUSTER_OPERATIONS] [MODE:JSON_GROUPS]

        <DATASET>
        ${JSON.stringify(minimizedWarrants)}
        </DATASET>

        <STRATEGY>
        1. CLUSTER_BY_GEO(Proximity/Neighborhood).
        2. CLUSTER_BY_MODUS(Same Crime/Gang).
        3. LINK_ENTITIES(Co-defendants/Family).
        4. IGNORE_SINGLES(Unless High Value).
        </STRATEGY>

        <OUTPUT_FORMAT>
        {
            "groups": [
                {
                    "operationName": "Creative Tactical Name (Ex: 'Op. Norte', 'Rede Tráfico')",
                    "reason": "Why these are grouped",
                    "targetIds": ["id1", "id2"],
                    "suggestedAction": "Simultaneous Raid / Surveillance",
                    "priority": "High/Medium/Low"
                }
            ]
        }
        </OUTPUT_FORMAT>
    `;

    try {
        const text = await tryGenerateContent(prompt);
        return parseGeminiJSON(text, { groups: [] });
    } catch (error) {
        console.error("Erro no Agrupamento Inteligente:", error);
        return { groups: [] };
    }
}
