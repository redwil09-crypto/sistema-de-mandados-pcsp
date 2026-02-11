
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker to load from CDN to avoid build setup issues with Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import { extractFullWarrantIntelligence, isGeminiEnabled } from './geminiService';

export interface ExtractedData {
    id: string;
    name: string;
    rg: string;
    cpf: string;
    processNumber: string;
    type: string;
    category: 'prison' | 'search';
    crime: string;
    regime: string;
    issueDate: string;
    expirationDate: string;
    addresses: string[];
    sourceFile: string;
    status: string;
    attachments: string[];
    observations?: string;
    tacticalSummary?: string[];
    autoPriority?: string[];
    searchChecklist?: string[];
    isDuplicate?: boolean;
    birthDate?: string;
    age?: string;
    issuingCourt?: string;
}

// --- HELPER PARSING FUNCTIONS (Regex Based) ---

const extractName = (text: string): string => {
    const exclusionList = [
        'VARA', 'COMARCA', 'FORO', 'CRIMINAL', 'JUSTIÇA', 'TRIBUNAL', 'ESTADO', 'ESTADUAL',
        'FEDERAL', 'MINISTÉRIO', 'PÚBLICO', 'PODER', 'JUDICIÁRIO', 'SECRETARIA', 'POLÍCIA',
        'CIVIL', 'MILITAR', 'DIPO', 'BNMP', 'SÃO PAULO', 'DELEGADO', 'ESCRIVÃO', 'JUIZ',
        'SOCIAL', 'NOME', 'FAMILIA', 'SUCESSÕES', 'SUCESSOES', 'JACAREI', 'CAPITAL', 'INTERIOR',
        'DOC', 'DIGITAL', 'ELETRÔNICO', 'MANDADO', 'PRISÃO', 'BUSCA', 'APREENSÃO'
    ];

    const patterns = [
        /Nome\s+da\s+Pessoa[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
        /MANDADO\s+DE\s+PRISÃO\s+CONTRA[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
        /(?:RÉU\(A\)|RÉU|INVESTIGADO|INDICIADO|QUALIFICADO|AUTOR|REQUERIDO|SENTENCIADO|EXECUTADO|ALVO)[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
        /(?:PESSOA A SER PRESA)[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
        /NOME[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            let potentialName = match[1].trim().split(/\n|,|\s{2,}/)[0].trim().toUpperCase();
            potentialName = potentialName.replace(/^(SOCIAL|NOME SOCIAL|NOME)[:\s]+/, '').trim();
            if (potentialName === 'NÃO INFORMADO' || potentialName === 'NAO INFORMADO') continue;
            const containsExclusion = exclusionList.some(word => potentialName.includes(word));
            if (potentialName.length > 5 && !containsExclusion) return potentialName;
        }
    }

    const uppercaseSequence = /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{3,}(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,})+)/g;
    const matches = Array.from(text.matchAll(uppercaseSequence));
    for (const match of matches) {
        const name = match[0].toUpperCase();
        const containsExclusion = exclusionList.some(word => name.includes(word));
        if (name.split(' ').length >= 2 && !containsExclusion && name.length > 8) return name;
    }
    return 'NOME NÃO IDENTIFICADO';
};

const calculateAge = (birthDate: string | undefined): string => {
    if (!birthDate) return '';
    try {
        let birth: Date | null = null;
        if (birthDate.includes('/')) {
            const [day, month, year] = birthDate.split('/');
            birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else if (birthDate.includes('-')) {
            const [year, month, day] = birthDate.split('-');
            birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        if (!birth || isNaN(birth.getTime())) return '';
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return `${age} anos`;
    } catch (e) { return ''; }
};

const extractRG = (text: string): string => {
    const rgPattern = /(?:RG|R\.G\.|Identidade|REGISTRO GERAL)[:\s]*([0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}[-\s]?[0-9X])/i;
    const match = text.match(rgPattern);
    return match ? match[1].trim() : '';
};

const extractCPF = (text: string): string => {
    const cpfPattern = /(?:CPF|C\.P\.F\.|CADASTRO DE PESSOA FISICA)[:\s]*([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}[-\s]?[0-9]{2})/i;
    const match = text.match(cpfPattern);
    return match ? match[1].trim() : '';
};

const extractProcessNumber = (text: string): string => {
    const processPattern = /([0-9]{7}[-\s]?[0-9]{2}\.?[0-9]{4}\.?[0-9]\.?[0-9]{2}\.?[0-9]{4})/;
    const match = text.match(processPattern);
    return match ? match[1].trim() : '';
};

const extractBirthDate = (text: string): string => {
    const birthPatterns = [
        /(?:nascimento|nascido em|data de nascimento)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
        /(?:nascimento|nascido em|data de nascimento)[:\s]*([0-9]{1,2})\s+de\s+([a-zç]+)\s+de\s+([0-9]{4})/i
    ];
    for (const pattern of birthPatterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[1] && (match[1].includes('/') || match[1].includes('-'))) {
                const [day, month, year] = match[1].split(/[\/\-]/);
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            } else if (match[1] && match[2] && match[3]) {
                const months: any = {
                    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
                    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
                    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
                };
                const monthKey = match[2].toLowerCase();
                if (months[monthKey]) return `${match[3]}-${months[monthKey]}-${match[1].padStart(2, '0')}`;
            }
        }
    }
    return '';
};

const extractIssuingCourt = (text: string): string => {
    const headerText = text.substring(0, 8000).replace(/\s+/g, ' ');
    const patterns = [
        /(?:Vara|Juízo|Ofício|Fórum|Comarca|JUÍZO DE DIREITO)[:\s]+([^-\n]+?)(?:\s-|\sProcesso|\sDigital|$)/i,
        /([0-9]+[ªº]?\s+Vara\s+(?:Criminal|Cível|da\s+Família|das\s+Sucessões|do\s+Júri|de\s+Execuções\s+Criminais|da\s+Infância|do\s+Juizado|Única)[^,\-]*)/i,
        /TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO\s+([A-Z0-9ªº\s]+VARA\s+[A-Z\s]+)/i,
        /(?:Foro|Comarca|Fórum)\s+de\s+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s\-]+?)(?:\s[-–]|\sSecretaria|\sEstado|\sJuiz)/i,
        /(Vara\s+(?:do\s+Júri|da\s+Infância|de\s+Execuções|Única|Criminal)[^,\-]*)/i
    ];
    for (const pattern of patterns) {
        const match = headerText.match(pattern);
        if (match && match[1]) {
            let court = match[1].trim().replace(/TRIBUNAL DE JUSTIÇA.*/i, '').replace(/ESTADO DE SÃO PAULO.*/i, '').replace(/JUIZ DE DIREITO.*/i, '').replace(/SECRETARIA.*/i, '').replace(/Processo Digital.*/i, '').replace(/[.:;]+$/, '').trim();
            if (court.length > 3 && court.length < 120) return court.toUpperCase();
        }
    }
    return '';
};

const extractDates = (text: string): { issueDate: string; expirationDate: string } => {
    const issuePatterns = [
        /(?:data\s+de\s+expedi[çc][ãa]o|data\s+de\s+emiss[ãa]o|data\s+do\s+documento|assinado\s+em)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
        /(?:data\s+de\s+expedi[çc][ãa]o|data\s+de\s+emiss[ãa]o|data\s+do\s+documento)[:\s]*([0-9]{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+([0-9]{4})/i,
        /Dado\s+e\s+passado.*?[,\s]+([0-9]{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+([0-9]{4})/i,
        /(?:SÃO\s+PAULO|COMARCA|FORO).*?[,\s]+([0-9]{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+([0-9]{4})/i,
        /([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/g,
    ];
    let issueDate = new Date().toISOString().split('T')[0];
    for (const pattern of issuePatterns) {
        if (pattern.global) {
            const matches = Array.from(text.matchAll(pattern));
            if (matches.length > 0) {
                const lastMatch = matches[matches.length - 1];
                const [day, month, year] = lastMatch[1].split(/[\/\-]/);
                issueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                break;
            }
        } else {
            const match = text.match(pattern);
            if (match) {
                if (match[1] && (match[1].includes('/') || match[1].includes('-'))) {
                    const [day, month, year] = match[1].split(/[\/\-]/);
                    issueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    break;
                } else if (match[1] && match[2] && match[3]) {
                    const months: any = { 'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12' };
                    if (months[match[2].toLowerCase()]) {
                        issueDate = `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, '0')}`;
                        break;
                    }
                }
            }
        }
    }
    let expirationDate = '';
    const expirationPatterns = [
        /(?:validade|vencimento|prescreve em|prescri[çc][ãa]o)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
        /(?:validade|vencimento)[:\s]*([0-9]{1,2})\s+de\s+([a-zç]+)\s+de\s+([0-9]{4})/i
    ];
    for (const pattern of expirationPatterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[1] && (match[1].includes('/') || match[1].includes('-'))) {
                const [day, month, year] = match[1].split(/[\/\-]/);
                expirationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                break;
            } else if (match[1] && match[2] && match[3]) {
                const months: any = { 'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12' };
                if (months[match[2].toLowerCase()]) {
                    expirationDate = `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, '0')}`;
                    break;
                }
            }
        }
    }
    if (!expirationDate) {
        const date = new Date(issueDate);
        date.setFullYear(date.getFullYear() + (text.toLowerCase().includes('busca e apreensão') ? 1 : 20));
        expirationDate = date.toISOString().split('T')[0];
    }
    return { issueDate, expirationDate };
};

const extractAddresses = (text: string): string[] => {
    const addresses: string[] = [];
    const pattern = /(?:ENDERE[ÇC]O(?:S)? DO PROCURADO|Endere[çc]o(?:s)? de Dilig[êe]ncia|Endere[çc]o(?:\s+Residencial)?|Resid[êe]ncia|Endere[çc]o(?:s)?(?:\s+do\s+Réu)?|Logradouro|Local(?:\s+para)?\s+cumprimento)[:\s]+((?:(?![A-ZÀ-Ú][A-ZÀ-Ú\s]+:).)+)/gim;
    const matches = text.matchAll(pattern);
    for (const match of matches) {
        if (match[1]) {
            let addr = match[1].trim().replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
            const stopWords = ['VARA', 'COMARCA', 'FORO', 'TRIBUNAL', 'JUIZ', 'ESCRIVÃO', 'DELEGADO', 'RELATOR', 'PROCESSO', 'CLASSE', 'ASSUNTO', 'NASCIMENTO', 'CPF', 'RG', 'FILIAÇÃO', 'NOME', 'QUALIFICAÇÃO', 'ESTADO CIVIL', 'PROFISSÃO', 'DOCUMENTO ASSINADO DIGITALMENTE', 'ASSINADO DIGITALMENTE'];
            const regexStop = new RegExp(`(${stopWords.join('|')})`, 'i');
            const splitMatch = addr.split(regexStop);
            if (splitMatch.length > 1) addr = splitMatch[0];
            addr = addr.replace(/[.;,]+$/, '').trim();
            const upperAddr = addr.toUpperCase();
            if (upperAddr.includes('NÃO INFORMADO') || upperAddr.includes('NÃO CONSTA') || upperAddr === 'SEM ENDEREÇO') addresses.push('Não informado');
            else if (addr.length > 5) addresses.push(addr);
        }
    }
    if (addresses.length === 0) return ['Não informado'];
    const uniqueAddresses = Array.from(new Set(addresses));
    return uniqueAddresses.length > 1 ? uniqueAddresses.filter(a => a !== 'Não informado') : uniqueAddresses;
};

const determineMandadoType = (text: string): { type: string; category: 'prison' | 'search' } => {
    const lowerText = text.toLowerCase();
    const isUnderage = lowerText.includes('ato infracional') || lowerText.includes('adolescente') || lowerText.includes('menor de idade');
    if (isUnderage || lowerText.includes('busca e apreensão')) return { type: 'BUSCA E APREENSÃO', category: 'search' };
    return { type: 'MANDADO DE PRISÃO', category: 'prison' };
};

const extractCrime = (text: string): string => {
    const lawArticlePattern = /(?:Assunto|Natureza|Capitula[çc][ãa]o|Incorreu\s+no(?:s)?\s+Artigo(?:s)?|Tipifica[çc][ãa]o|Artigo\(s\)|Delito\(s\)|Incid[êe]ncia\s+Penal)[:\s\d]*([0-9]{2,4})/i;
    let articleMatch = text.match(lawArticlePattern) || text.match(/\bArt(?:\.|igo)?\s*([0-9]{2,4})/i);
    if (articleMatch && articleMatch[1]) {
        const art = articleMatch[1];
        const artMap: any = { '157': 'Roubo', '155': 'Furto', '33': 'Tráfico de Drogas', '35': 'Tráfico de Drogas', '121': 'Homicídio', '129': 'Lesão corporal', '213': 'Estupro / Crime Sexual', '217': 'Estupro / Crime Sexual', '180': 'Receptação', '171': 'Estelionato', '147': 'Ameaça', '158': 'Extorsão', '159': 'Extorsão mediante sequestro', '14': 'Armas (Lei 10826)', '16': 'Armas (Lei 10826)', '302': 'Crimes de Trânsito', '303': 'Crimes de Trânsito', '331': 'Desacato', '329': 'Resistência' };
        if (artMap[art]) return artMap[art];
    }
    const specificRules = [
        { crime: "Pensão alimenticia", keywords: [/pens[ãa]o/i, /aliment[íi]cia/i, /d[ée]bito\s+alimentar/i, /d[íi]vida\s+de\s+alimentos/i, /pris[ãa]o\s+civil/i] },
        { crime: "Homicídio", keywords: [/homic[íi]dio/i, /matar/i, /assassinato/i, /art\.?\s*121/i] },
        { crime: "Feminicídio", keywords: [/feminic[íi]dio/i] },
        { crime: "Roubo", keywords: [/roubo/i, /assalto/i, /art\.?\s*157/i] },
        { crime: "Furto", keywords: [/furto/i, /art\.?\s*155/i] },
        { crime: "Drogas/Trafico", keywords: [/tr[áa]fico/i, /entorpecente/i, /drogas/i, /art\.?\s*33/i, /art\.?\s*35/i] },
        { crime: "Violencia domestica", keywords: [/maria\s+da\s+penha/i, /viol[êe]ncia\s+dom[ée]stica/i] },
        { crime: "Estupro", keywords: [/estupro/i, /lasc[íi]via/i, /dignidade\s+sexual/i, /estupro\s+de\s+vulner[áa]vel/i, /art\.?\s*213/i, /art\.?\s*217/i] },
        { crime: "Armas", keywords: [/arma\s+de\s+fogo/i, /porte\s+ilegal/i, /posse\s+de\s+arma/i, /art\.?\s*14/i, /art\.?\s*16/i] },
        { crime: "Estelionato", keywords: [/estelionato/i, /fraude/i, /art\.?\s*171/i] },
        { crime: "Receptação", keywords: [/recepta[çc][ãa]o/i, /art\.?\s*180/i] },
        { crime: "Ameaça", keywords: [/amea[çc]a/i, /art\.?\s*147/i] },
        { crime: "Crimes de Trânsito", keywords: [/tr[âa]nsito/i, /codingo\s+de\s+transito/i, /embriaguez/i, /art\.?\s*302/i, /art\.?\s*303/i] },
    ];
    for (const rule of specificRules) { if (rule.keywords.some(kw => kw.test(text))) return rule.crime; }
    return 'Outros';
};

const extractRegime = (text: string, category: 'prison' | 'search', crime: string): string => {
    if (category === 'search') return /\baudi[êe]ncia\s+de\s+justificativa\b/i.test(text) ? "Audiência de Justificativa" : 'Localização';
    if (crime === "Pensão alimenticia") return "Civil";
    const regimeRules = [{ label: "Fechado", pattern: /\bfechado\b/i }, { label: "Semiaberto", pattern: /\bsemiaberto\b|\bsemi-aberto\b/i }, { label: "Aberto", pattern: /\baberto\b/i }, { label: "Preventiva", pattern: /\bpreventiva\b/i }, { label: "Temporária", pattern: /\btempor[áa]ria\b/i }, { label: "Contramandado", pattern: /\bcontramandado\b/i }];
    for (const rule of regimeRules) { if (rule.pattern.test(text)) return rule.label; }
    return /\bcivil\b/i.test(text) ? "Civil" : 'Outro';
};

const extractObservations = (text: string): string => {
    const results: string[] = [];
    const patterns = [{ label: 'Prazo', regex: /Prazo da Prisão[:\s]+([^;\n]{1,100})/i }, { label: 'Dívida', regex: /Valor da Dívida de Alimentos[:\s]+([^;\n]{1,100})/i }, { label: 'Ofício DIG', regex: /(?:Of[íi]cio\s+DIG|DIG-nº)[:\s]+([^;\n]{1,50})/i }];
    patterns.forEach(p => { const m = text.match(p.regex); if (m && m[1]) results.push(`${p.label}: ${m[1].trim()}`); });
    const phones = text.match(/(?:\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4})/g);
    if (phones) results.push(`Telefones: ${Array.from(new Set(phones)).join(', ')}`);
    return results.join(' | ');
};

const extractTacticalSummary = (text: string): string[] => {
    const markers = [{ label: 'Histórico de Resistência', regex: /(resistencia|desobediencia|fuga|evadiu)/gi }, { label: 'Uso de Arma de Fogo', regex: /(arma de fogo|pistola|revolver|fuzil)/gi }, { label: 'Organização Criminosa', regex: /(pcc\b|comando vermelho|fac[çc][ãa]o criminosa)/gi }, { label: 'Violência Extrema', regex: /(tortura|crueldade|grave amea[çc]a|violencia)/gi }];
    const summary: string[] = [];
    markers.forEach(m => { if (m.regex.test(text)) summary.push(m.label); });
    return summary;
};

// --- CORE EXPORTED FUNCTIONS ---

/**
 * Extracts raw text from a PDF file. Use this for AI strategies.
 */
export const extractRawTextFromPdf = async (file: File): Promise<string> => {
    try {
        const fileName = file.name.toLowerCase();
        let fullText = '';

        if (fileName.endsWith('.pdf')) {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += `--- PÁGINA ${i} ---\n` + textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
            }
        } else if (fileName.endsWith('.docx')) {
            const mammoth = await import('mammoth');
            const arrayBuffer = await file.arrayBuffer();
            // @ts-ignore
            const result = await mammoth.extractRawText({ arrayBuffer });
            fullText = result.value;
        } else {
            fullText = await file.text();
        }
        return fullText;
    } catch (error) {
        console.error("Extraction Raw Error:", error);
        throw new Error("Falha ao ler conteúdo do arquivo.");
    }
};

/**
 * Legacy Alias for extractRawTextFromPdf to support existing callers like WarrantDetail
 */
export const extractPdfData = extractRawTextFromPdf;

/**
 * Extracts structured data using Regex Fallback or Gemini if enabled.
 */
export const extractStructuredPdfData = async (file: File): Promise<ExtractedData> => {
    const fullText = await extractRawTextFromPdf(file);

    // AI Strategy First
    if (await isGeminiEnabled() && fullText.length > 50) {
        try {
            const aiData = await extractFullWarrantIntelligence(fullText);
            if (aiData?.name) {
                return {
                    id: Date.now().toString(),
                    name: aiData.name,
                    rg: aiData.rg || '',
                    cpf: aiData.cpf || '',
                    processNumber: aiData.processNumber || '',
                    type: aiData.type || 'MANDADO DE PRISÃO',
                    category: (aiData.type?.includes('BUSCA')) ? 'search' : 'prison',
                    crime: aiData.crime || 'Outros',
                    regime: aiData.regime || 'Outro',
                    issueDate: aiData.issueDate || new Date().toISOString().split('T')[0],
                    expirationDate: aiData.expirationDate || '',
                    addresses: aiData.addresses?.length ? aiData.addresses : ['Não informado'],
                    sourceFile: file.name,
                    status: 'EM ABERTO',
                    attachments: [file.name],
                    observations: aiData.observations || '',
                    tacticalSummary: [],
                    autoPriority: aiData.tags || [],
                    birthDate: aiData.birthDate || '',
                    age: calculateAge(aiData.birthDate),
                    issuingCourt: aiData.issuingCourt || ''
                };
            }
        } catch (e) {
            console.warn("AI extraction failed, using regex fallback.");
        }
    }

    // Regex Fallback
    const name = extractName(fullText);
    const { issueDate, expirationDate } = extractDates(fullText);
    const { type, category } = determineMandadoType(fullText);
    const crime = extractCrime(fullText);
    const tacticalMarkers = extractTacticalSummary(fullText);

    return {
        id: Date.now().toString(),
        name,
        rg: extractRG(fullText),
        cpf: extractCPF(fullText),
        processNumber: extractProcessNumber(fullText),
        type,
        category,
        crime,
        regime: extractRegime(fullText, category, crime),
        issueDate,
        expirationDate,
        addresses: extractAddresses(fullText),
        sourceFile: file.name,
        status: 'EM ABERTO',
        attachments: [file.name],
        observations: extractObservations(fullText),
        tacticalSummary: tacticalMarkers,
        autoPriority: [],
        birthDate: extractBirthDate(fullText),
        age: calculateAge(extractBirthDate(fullText)),
        issuingCourt: extractIssuingCourt(fullText)
    };
};

/**
 * Direct text extraction (from Paste)
 */
export const extractFromText = async (text: string, sourceName: string = "Entrada Manual"): Promise<ExtractedData> => {
    // Regex based parsing directly from text
    const name = extractName(text);
    const { issueDate, expirationDate } = extractDates(text);
    const { type, category } = determineMandadoType(text);
    const crime = extractCrime(text);

    return {
        id: Date.now().toString(),
        name,
        rg: extractRG(text),
        cpf: extractCPF(text),
        processNumber: extractProcessNumber(text),
        type,
        category,
        crime,
        regime: extractRegime(text, category, crime),
        issueDate,
        expirationDate,
        addresses: extractAddresses(text),
        sourceFile: sourceName,
        status: 'EM ABERTO',
        attachments: [],
        observations: extractObservations(text),
        tacticalSummary: extractTacticalSummary(text),
        birthDate: extractBirthDate(text),
        age: calculateAge(extractBirthDate(text)),
        issuingCourt: extractIssuingCourt(text)
    };
};
