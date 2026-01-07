import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface ExtractedData {
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
    tacticalSummary?: string[]; // New: Periculosidade/Modus Operandi
    autoPriority?: string[];    // New: Sugestão de tags
    searchChecklist?: string[];  // New: Itens para busca
    isDuplicate?: boolean;      // New: Verificação de duplicidade
}

// Helper functions for parsing
const extractName = (text: string): string => {
    // Lista de exclusão para evitar capturar nomes de Varas, Fóruns ou Tribunais
    const exclusionList = [
        'VARA', 'COMARCA', 'FORO', 'CRIMINAL', 'JUSTIÇA', 'TRIBUNAL', 'ESTADO', 'ESTADUAL',
        'FEDERAL', 'MINISTÉRIO', 'PÚBLICO', 'PODER', 'JUDICIÁRIO', 'SECRETARIA', 'POLÍCIA',
        'CIVIL', 'MILITAR', 'DIPO', 'BNMP', 'SÃO PAULO', 'DELEGADO', 'ESCRIVÃO', 'JUIZ'
    ];

    // Padrões específicos para nomes em mandados
    const patterns = [
        /(?:Nome da Pessoa|RÉU\(A\)|RÉU|INVESTIGADO|INDICIADO|QUALIFICADO)[:\s]+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,})/i,
        /MANDADO DE PRISÃO CONTRA\s+([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,})/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            const potentialName = match[1].trim().split(/\n|,|\s{2,}/)[0].trim().toUpperCase();

            // Verifica se o nome capturado não contém palavras da lista de exclusão
            const containsExclusion = exclusionList.some(word => potentialName.includes(word));
            if (potentialName.length > 5 && !containsExclusion) {
                return potentialName;
            }
        }
    }

    // Se falhar, procura a maior sequência de maiúsculas que não esteja na lista de exclusão
    const uppercaseSequence = /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{3,}(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,})+)/g;
    const matches = text.matchAll(uppercaseSequence);
    for (const match of matches) {
        const name = match[0].toUpperCase();
        const containsExclusion = exclusionList.some(word => name.includes(word));
        if (name.split(' ').length >= 2 && !containsExclusion && name.length > 8) {
            return name;
        }
    }

    return 'Não identificado';
};

const extractRG = (text: string): string => {
    const rgPattern = /(?:RG|R\.G\.|Identidade)[:\s]*([0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}[-\s]?[0-9X])/i;
    const match = text.match(rgPattern);
    return match ? match[1].trim() : '';
};

const extractCPF = (text: string): string => {
    const cpfPattern = /(?:CPF|C\.P\.F\.)[:\s]*([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}[-\s]?[0-9]{2})/i;
    const match = text.match(cpfPattern);
    return match ? match[1].trim() : '';
};

const extractProcessNumber = (text: string): string => {
    const processPattern = /([0-9]{7}[-\s]?[0-9]{2}\.?[0-9]{4}\.?[0-9]\.?[0-9]{2}\.?[0-9]{4})/;
    const match = text.match(processPattern);
    return match ? match[1].trim() : '';
};

const extractDates = (text: string): { issueDate: string; expirationDate: string } => {
    const datePatterns = [
        /(?:expedi[çc][ãa]o|emiss[ãa]o|data)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
        /([0-9]{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+([0-9]{4})/i,
    ];

    let issueDate = new Date().toISOString().split('T')[0];

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[1] && match[1].includes('/')) {
                const [day, month, year] = match[1].split('/');
                issueDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                break;
            } else if (match[1] && match[2] && match[3]) {
                const months: any = {
                    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
                    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
                    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
                };
                issueDate = `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, '0')}`;
                break;
            }
        }
    }

    const date = new Date(issueDate);
    const isBusca = text.toLowerCase().includes('busca e apreensão');

    if (isBusca) {
        date.setDate(date.getDate() + 180);
    } else {
        date.setFullYear(date.getFullYear() + 20);
    }

    return { issueDate, expirationDate: date.toISOString().split('T')[0] };
};

const extractAddresses = (text: string): string[] => {
    const addresses: string[] = [];
    // Tenta encontrar o endereço do procurado com diversos rótulos
    const pattern = /(?:ENDERE[ÇC]O(?:S)? DO PROCURADO|Endere[çc]o(?:s)? de Dilig[êe]ncia|Resid[êe]ncia|Endere[çc]o(?:s)?(?:\s+do\s+Réu)?|Logradouro)[:\s]+([^;\n]+)/gi;

    const matches = text.matchAll(pattern);
    for (const match of matches) {
        if (match[1]) {
            let addr = match[1].trim();
            // Corta APÓS Cidade-Estado (ex: "Cajamar - SP", "São Paulo - SP", etc.)
            // Procura por hífens seguidos de siglas de estados (2 letras maiúsculas)
            const cityStatePattern = /[\s,]+[A-Z][a-záéíóúâêîôûãõç]+\s*-\s*[A-Z]{2}\b|[\s,]+[A-Z]{2}\b/i;
            const cityMatch = addr.match(cityStatePattern);
            if (cityMatch) {
                // Inclui a sigla do estado no endereço final (posição do match + tamanho do match)
                addr = addr.substring(0, cityMatch.index + cityMatch[0].length).trim();
            }

            // Limpeza adicional (quebra de linha dupla ou ponto final de parágrafo)
            addr = addr.split(/\n\n|\.\s[A-Z]/)[0].trim();

            if (addr.length > 5 && !['VARA', 'COMARCA', 'FORO', 'TRIBUNAL'].some(word => addr.toUpperCase().includes(word))) {
                addresses.push(addr);
            }
        }
    }

    return addresses.length > 0 ? Array.from(new Set(addresses)) : ['Não identificado'];
};

const determineMandadoType = (text: string): { type: string; category: 'prison' | 'search' } => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('busca e apreensão')) return { type: 'Mandado de Busca e Apreensão', category: 'search' };
    if (lowerText.includes('preventiva')) return { type: 'Mandado de Prisão Preventiva', category: 'prison' };
    if (lowerText.includes('temporária')) return { type: 'Mandado de Prisão Temporária', category: 'prison' };
    return { type: 'Mandado de Prisão', category: 'prison' };
};

const extractCrime = (text: string): string => {
    const crimes = [
        "Ameaça/Injuria/Briga/Lesão", "Armas", "Drogas/Trafico", "Furto", "Roubo",
        "Lesão corporal", "Homicídio", "Crimes Sexuais (Estupro)", "Pensão alimenticia",
        "Receptação", "Corrupção", "Violencia domestica", "Estelionato", "Crimes de Trânsito",
        "Porte Ilegal de Arma de Fogo", "Feminicídio", "Crimes Virtuais", "Ato Infracional"
    ];

    const lowerText = text.toLowerCase();

    // Regra especial: se o texto contém civil ou alimentos, é pensão alimentícia
    if (lowerText.includes('civil') || lowerText.includes('alimentos')) {
        return "Pensão alimenticia";
    }

    for (const crime of crimes) {
        // Pega a primeira parte se houver barra (ex: Roubo/Furto -> Roubo)
        const parts = crime.split('/');
        for (const p of parts) {
            const keyword = p.split(' ')[0].toLowerCase().replace(/[()]/g, '');
            if (keyword.length > 3 && lowerText.includes(keyword)) return crime;
        }
    }

    // Fallback: procura por numerais de artigos (ex: Art. 155, Artigo 121)
    const articlePattern = /(?:Art\.?|Artigo)[:\s]*([0-9]{2,4})/i;
    const articleMatch = text.match(articlePattern);
    if (articleMatch && articleMatch[1]) {
        return `Artigo: ${articleMatch[1]}`;
    }

    return 'Outros';
};

const extractRegime = (text: string, category: 'prison' | 'search', crime: string): string => {
    if (category === 'search') return 'Localização';

    // Regra especial: se for Pensão Alimenticia, o regime é Civil
    if (crime === "Pensão alimenticia") return "Civil";

    const regimes = [
        "Fechado", "Aberto", "Civil", "Semiaberto", "Preventiva",
        "Temporária", "Of. Cobrança", "Contramandado", "Localização", "Outro"
    ];

    const lowerText = text.toLowerCase();
    for (const regime of regimes) {
        if (lowerText.includes(regime.toLowerCase())) return regime;
    }

    return 'Outro';
};

const extractObservations = (text: string): string => {
    const results: string[] = [];
    const patterns = [
        { label: 'Prazo', regex: /Prazo da Prisão[:\s]+([^;\n]{1,100})/i },
        { label: 'Dívida', regex: /Valor da Dívida de Alimentos[:\s]+([^;\n]{1,100})/i },
        { label: 'Atualização', regex: /Data da Atualização da Dívida[:\s]+([^;\n]{1,100})/i },
    ];

    for (const p of patterns) {
        const m = text.match(p.regex);
        if (m && m[1]) {
            let val = m[1].trim();
            val = val.split(/(?:MANDADO|PRISÃO|IDENTIFICAÇÃO)/i)[0].trim();

            const forbidden = ['NÃO INFORMADO', 'EM BRANCO', 'MANDADO', 'PRISÃO', 'CIVIL', 'IDENTIFICAÇÃO', 'BIOMÉTRICA'];
            const isNoise = forbidden.some(word => val.toUpperCase().includes(word));

            if (val.length > 2 && !isNoise) {
                results.push(`${p.label}: ${val}`);
            }
        }
    }

    const phonePattern = /(?:\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4})/g;
    const phones = text.match(phonePattern);
    if (phones && phones.length > 0) {
        const uniquePhones = Array.from(new Set(phones));
        results.push(`Telefones: ${uniquePhones.join(', ')}`);
    }

    return results.join(' | ');
};

const extractTacticalSummary = (text: string): string[] => {
    const markers = [
        { label: 'Histórico de Resistência', regex: /(resistencia|desobediencia|fuga|evadiu)/gi },
        { label: 'Uso de Arma de Fogo', regex: /(arma|fogo|pistola|revolver|munica[oc]o)/gi },
        { label: 'Organização Criminosa', regex: /(pcc|comando|fac[çc][ãa]o|organiza[çc][ãa]o)/gi },
        { label: 'Violência Extrema', regex: /(tortura|crueldade|grave amea[çc]a|violencia)/gi },
        { label: 'Tráfico de Grande Porte', regex: /(quilos|laborat[óo]rio|refino|balan[çc]a)/gi }
    ];

    const summary: string[] = [];
    markers.forEach(m => {
        if (m.regex.test(text)) summary.push(m.label);
    });
    return summary;
};

const extractSearchChecklist = (text: string, category: string): string[] => {
    if (category !== 'search') return [];

    const checklist: string[] = [];
    const items = [
        { label: 'Telefones Celulares / Smartphones', regex: /(celular|smartphone|aparelho telefonico)/gi },
        { label: 'Computadores / Laptops', regex: /(computador|notebook|laptop|informatica)/gi },
        { label: 'Documentos / Arquivos', regex: /(documento|arquivo|anota[çc][ãa]o|papel)/gi },
        { label: 'Dinheiro em Espécie', regex: /(dinheiro|especie|moeda|valores)/gi },
        { label: 'Mídias (Pen-drive/HD)', regex: /(pendrive|hd externo|midia|dispositivo de armazenamento)/gi },
        { label: 'Armas / Munições', regex: /(arma|fogo|munica[çc][ãa]o|projetil)/gi },
        { label: 'Veículos', regex: /(veiculo|carro|moto|propriedade)/gi }
    ];

    items.forEach(item => {
        if (item.regex.test(text)) checklist.push(item.label);
    });

    return checklist.length > 0 ? checklist : ['Itens genéricos de busca'];
};

const determineAutoPriority = (text: string, crime: string): string[] => {
    const tags: string[] = [];
    const highPriorityCrimes = ['Homicídio', 'Feminicídio', 'Roubo', 'Crimes Sexuais (Estupro)', 'Drogas/Trafico'];

    if (highPriorityCrimes.includes(crime)) tags.push('Urgente');
    if (text.toLowerCase().includes('prazo determinado') || text.toLowerCase().includes('imediato')) tags.push('Prioridade');
    if (crime === 'Pensão alimenticia') tags.push('Ofício de Cobrança');

    return Array.from(new Set(tags));
};

// Main extraction function
export const extractPdfData = async (file: File): Promise<ExtractedData> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }

        // Parse extracted text
        const name = extractName(fullText);
        const rg = extractRG(fullText);
        const cpf = extractCPF(fullText);
        const processNumber = extractProcessNumber(fullText);
        const { issueDate, expirationDate } = extractDates(fullText);
        const addresses = extractAddresses(fullText);
        const { type, category } = determineMandadoType(fullText);
        const crime = extractCrime(fullText);
        const regime = extractRegime(fullText, category, crime);

        return {
            id: Date.now().toString(),
            name,
            rg,
            cpf,
            processNumber,
            type,
            category,
            crime,
            regime,
            issueDate,
            expirationDate,
            addresses,
            sourceFile: file.name,
            status: 'EM ABERTO',
            attachments: [file.name],
            observations: extractObservations(fullText),
            tacticalSummary: extractTacticalSummary(fullText),
            searchChecklist: extractSearchChecklist(fullText, category),
            autoPriority: determineAutoPriority(fullText, crime)
        };
    } catch (error: any) {
        console.error('Erro detalhado ao extrair PDF:', error);
        throw new Error(`Falha ao processar o PDF: ${error.message || 'Verifique se o arquivo é válido.'}`);
    }
};

// Function to extract from text input
export const extractFromText = (text: string, sourceName: string): ExtractedData => {
    const name = extractName(text);
    const rg = extractRG(text);
    const cpf = extractCPF(text);
    const processNumber = extractProcessNumber(text);
    const { issueDate, expirationDate = new Date().toISOString().split('T')[0] } = extractDates(text);
    const addresses = extractAddresses(text);
    const { type, category } = determineMandadoType(text);
    const crime = extractCrime(text);
    const regime = extractRegime(text, category, crime);

    return {
        id: Date.now().toString(),
        name,
        rg,
        cpf,
        processNumber,
        type,
        category,
        crime,
        regime,
        issueDate,
        expirationDate,
        addresses,
        sourceFile: sourceName,
        status: 'EM ABERTO',
        attachments: [],
        observations: extractObservations(text),
        tacticalSummary: extractTacticalSummary(text),
        searchChecklist: extractSearchChecklist(text, category),
        autoPriority: determineAutoPriority(text, crime)
    };
};
