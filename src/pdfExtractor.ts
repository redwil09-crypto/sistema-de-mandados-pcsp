import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using CDN to avoid Vite/Bundler build issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
    birthDate?: string;         // New: Data de Nascimento
    age?: string;               // New: Idade calculada
}

// Helper functions for parsing
const extractName = (text: string): string => {
    // Lista de exclusão para evitar capturar nomes de Varas, Fóruns ou Tribunais
    const exclusionList = [
        'VARA', 'COMARCA', 'FORO', 'CRIMINAL', 'JUSTIÇA', 'TRIBUNAL', 'ESTADO', 'ESTADUAL',
        'FEDERAL', 'MINISTÉRIO', 'PÚBLICO', 'PODER', 'JUDICIÁRIO', 'SECRETARIA', 'POLÍCIA',
        'CIVIL', 'MILITAR', 'DIPO', 'BNMP', 'SÃO PAULO', 'DELEGADO', 'ESCRIVÃO', 'JUIZ',
        'SOCIAL', 'NOME', 'FAMILIA', 'SUCESSÕES', 'SUCESSOES', 'JACAREI', 'CAPITAL', 'INTERIOR',
        'DOC', 'DIGITAL', 'ELETRÔNICO', 'MANDADO', 'PRISÃO', 'BUSCA', 'APREENSÃO'
    ];

    // Padrões específicos para nomes em mandados
    const patterns = [
        /Nome\s+da\s+Pessoa[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
        /MANDADO\s+DE\s+PRISÃO\s+CONTRA[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
        /(?:RÉU\(A\)|RÉU|INVESTIGADO|INDICIADO|QUALIFICADO|AUTOR|REQUERIDO|SENTENCIADO)[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
        /NOME[:\s]+([a-zA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑáàâãéèêíïóôõöúçñ\s\-']{5,})/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            let potentialName = match[1].trim().split(/\n|,|\s{2,}/)[0].trim().toUpperCase();

            // Limpeza adicional para remover prefixos que podem ter sobrado
            potentialName = potentialName.replace(/^(SOCIAL|NOME SOCIAL|NOME)[:\s]+/, '').trim();

            if (potentialName === 'NÃO INFORMADO' || potentialName === 'NAO INFORMADO') continue;

            const containsExclusion = exclusionList.some(word => potentialName.includes(word));
            if (potentialName.length > 5 && !containsExclusion) {
                return potentialName;
            }
        }
    }

    // Se falhar, procura a maior sequência de maiúsculas que não esteja na lista de exclusão
    const uppercaseSequence = /([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{3,}(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,})+)/g;
    const matches = Array.from(text.matchAll(uppercaseSequence));
    for (const match of matches) {
        const name = match[0].toUpperCase();
        const containsExclusion = exclusionList.some(word => name.includes(word));
        if (name.split(' ').length >= 2 && !containsExclusion && name.length > 8) {
            return name;
        }
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
    } catch (e) {
        return '';
    }
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
                if (months[monthKey]) {
                    return `${match[3]}-${months[monthKey]}-${match[1].padStart(2, '0')}`;
                }
            }
        }
    }
    return '';
};

const extractDates = (text: string): { issueDate: string; expirationDate: string } => {
    // 1. Tenta extrair Data de Expedição
    const issuePatterns = [
        // Padrões mais específicos primeiro (com rótulos)
        /(?:data\s+de\s+expedi[çc][ãa]o|data\s+de\s+emiss[ãa]o|data\s+do\s+documento|assinado\s+em)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
        /(?:data\s+de\s+expedi[çc][ãa]o|data\s+de\s+emiss[ãa]o|data\s+do\s+documento)[:\s]*([0-9]{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+([0-9]{4})/i,
        // Frase de encerramento
        /Dado\s+e\s+passado.*?[,\s]+([0-9]{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+([0-9]{4})/i,
        // Local e Data (geralmente ao final)
        /(?:SÃO\s+PAULO|COMARCA|FORO).*?[,\s]+([0-9]{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+([0-9]{4})/i,
        // Formato DD/MM/AAAA genérico (evitando pegar nascimento se possível, buscando o último no texto)
        /([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/g,
    ];

    let issueDate = new Date().toISOString().split('T')[0];

    for (const pattern of issuePatterns) {
        if (pattern.global) {
            const matches = Array.from(text.matchAll(pattern));
            if (matches.length > 0) {
                // Para padrões genéricos, pega a ULTIMA data (provavelmente expedição, não nascimento)
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
                    const months: any = {
                        'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
                        'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
                        'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
                    };
                    const monthKey = match[2].toLowerCase();
                    if (months[monthKey]) {
                        issueDate = `${match[3]}-${months[monthKey]}-${match[1].padStart(2, '0')}`;
                        break;
                    }
                }
            }
        }
    }

    // 2. Tenta extrair Data de Validade / Prescrição explicitamente
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
                const months: any = {
                    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
                    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
                    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
                };
                const monthKey = match[2].toLowerCase();
                if (months[monthKey]) {
                    expirationDate = `${match[3]}-${months[monthKey]}-${match[1].padStart(2, '0')}`;
                    break;
                }
            }
        }
    }

    // Fallback: Se não encontrou validade explícita, calcula
    if (!expirationDate) {
        const date = new Date(issueDate);
        const isBusca = text.toLowerCase().includes('busca e apreensão');

        if (isBusca) {
            date.setDate(date.getDate() + 180);
        } else {
            date.setFullYear(date.getFullYear() + 20); // Regra geral padrão 20 anos se não especificado
        }
        expirationDate = date.toISOString().split('T')[0];
    }

    return { issueDate, expirationDate };
};

const extractAddresses = (text: string): string[] => {
    const addresses: string[] = [];
    // Regex ajustada para capturar múltiplas linhas permitindo quebras de linha até encontrar um padrão de parada (ex: duplo enter ou palavras chave)
    // ([^;\n]+(?:[\r\n]+(?![A-ZÀ-Ú][a-zà-ú]+:)[^;\n]+)*) -> Tenta pegar linhas subsequentes que não pareçam ser um novo rótulo "Label:"
    const pattern = /(?:ENDERE[ÇC]O(?:S)? DO PROCURADO|Endere[çc]o(?:s)? de Dilig[êe]ncia|Resid[êe]ncia|Endere[çc]o(?:s)?(?:\s+do\s+Réu)?|Logradouro)[:\s]+((?:(?![A-ZÀ-Ú][A-ZÀ-Ú\s]+:).)+)/gim;

    const matches = text.matchAll(pattern);
    for (const match of matches) {
        if (match[1]) {
            let addr = match[1].trim();

            // Pega apenas a primeira linha relevante ou até o padrão de Cidade-UF se existir e ser finalizador
            // Mas cuidado para não cortar cedo demais. Vamos tentar limpar quebras de linha excessivas.
            addr = addr.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');

            // Corta se encontrar palavras chave que indicam fim do campo de endereço no formulário
            const stopWords = [
                'VARA', 'COMARCA', 'FORO', 'TRIBUNAL', 'JUIZ', 'ESCRIVÃO', 'DELEGADO',
                'RELATOR', 'PROCESSO', 'CLASSE', 'ASSUNTO', 'NASCIMENTO', 'CPF', 'RG',
                'FILIAÇÃO', 'NOME', 'QUALIFICAÇÃO', 'ESTADO CIVIL', 'PROFISSÃO',
                'DOCUMENTO ASSINADO DIGITALMENTE', 'ASSINADO DIGITALMENTE'
            ];
            const regexStop = new RegExp(`(${stopWords.join('|')})`, 'i');
            const splitMatch = addr.split(regexStop);
            if (splitMatch.length > 1) {
                addr = splitMatch[0];
            }

            // Limpeza final
            addr = addr.replace(/[.;,]+$/, '').trim();

            const upperAddr = addr.toUpperCase();
            if (upperAddr.includes('NÃO INFORMADO') || upperAddr.includes('NÃO CONSTA') || upperAddr === 'SEM ENDEREÇO') {
                addresses.push('Não informado');
            } else if (addr.length > 5) {
                addresses.push(addr);
            }
        }
    }

    // Se não houver nada ou se os endereços capturados forem inválidos
    if (addresses.length === 0) return ['Não informado'];

    // Remove duplicatas e retira placeholders se houver endereços reais
    const uniqueAddresses = Array.from(new Set(addresses));
    if (uniqueAddresses.length > 1) {
        const filtered = uniqueAddresses.filter(a => a !== 'Não informado');
        return filtered.length > 0 ? filtered : ['Não informado'];
    }

    return uniqueAddresses;
};

const determineMandadoType = (text: string): { type: string; category: 'prison' | 'search' } => {
    const lowerText = text.toLowerCase();

    // Verificação de menor de idade (Data de Nascimento ou palavras-chave)
    const birthPatterns = [
        /(?:nascimento|nascido em|data de nascimento)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
        /(?:nascimento|nascido em|data de nascimento)[:\s]*([0-9]{1,2})\s+de\s+([a-zç]+)\s+de\s+([0-9]{4})/i
    ];

    let isUnderage = lowerText.includes('ato infracional') || lowerText.includes('adolescente') || lowerText.includes('menor de idade');

    if (!isUnderage) {
        for (const pattern of birthPatterns) {
            const match = text.match(pattern);
            if (match) {
                let birthDate: Date | null = null;
                if (match[1] && (match[1].includes('/') || match[1].includes('-'))) {
                    const [day, month, year] = match[1].split(/[\/\-]/);
                    birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else if (match[1] && match[2] && match[3]) {
                    const months: any = {
                        'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3,
                        'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
                        'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
                    };
                    if (months[match[2].toLowerCase()] !== undefined) {
                        birthDate = new Date(parseInt(match[3]), months[match[2].toLowerCase()], parseInt(match[1]));
                    }
                }

                if (birthDate && !isNaN(birthDate.getTime())) {
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    if (age < 18) isUnderage = true;
                    break;
                }
            }
        }
    }

    if (isUnderage || lowerText.includes('busca e apreensão')) {
        return { type: 'BUSCA E APREENSÃO', category: 'search' };
    }

    if (lowerText.includes('preventiva')) return { type: 'MANDADO DE PRISÃO', category: 'prison' };
    if (lowerText.includes('temporária')) return { type: 'MANDADO DE PRISÃO', category: 'prison' };
    return { type: 'MANDADO DE PRISÃO', category: 'prison' };
};

const extractCrime = (text: string): string => {
    const lowerText = text.toLowerCase();

    // 1. Procurar por campos explícitos e artigos da legislação
    // Capitulação, Assunto ou Artigo
    const lawArticlePattern = /(?:Assunto|Natureza|Capitula[çc][ãa]o|Incorreu\s+no(?:s)?\s+Artigo(?:s)?|Tipifica[çc][ãa]o|Artigo\(s\))[:\s\d]*([0-9]{2,4})/i;
    const articleMatch = text.match(lawArticlePattern);

    if (articleMatch && articleMatch[1]) {
        const art = articleMatch[1];
        if (art === '157') return "Roubo";
        if (art === '155') return "Furto";
        if (art === '33' || art === '35') return "Drogas/Trafico";
        if (art === '121') return "Homicídio";
        if (art === '129') return "Lesão corporal";
        if (art === '213' || art === '217') return "Crimes Sexuais (Estupro)";
        if (art === '180') return "Receptação";
        if (art === '171') return "Estelionato";
        if (art === '147') return "Ameaça/Injuria/Briga/Lesão";
        if (art === '14' || art === '16') return "Armas";
        if (art === '302' || art === '303') return "Crimes de Trânsito";
    }

    // 2. Busca por palavras-chave específicas com fronteiras de palavra (\b)
    const specificRules = [
        { crime: "Pensão alimenticia", keywords: [/\bpens[ãa]o\b/i, /\baliment[íi]cia\b/i, /\bd[ée]bito\s+alimentar\b/i, /\bd[íi]vida\s+de\s+alimentos\b/i, /\bpris[ãa]o\s+civil\b/i] },
        { crime: "Homicídio", keywords: [/\bhomic[íi]dio\b/i, /\bmatar\b/i, /\bassassinato\b/i] },
        { crime: "Feminicídio", keywords: [/\bfeminic[íi]dio\b/i] },
        { crime: "Roubo", keywords: [/\broubo\b/i, /\bassalto\b/i, /\bart\.?\s*157\b/i] },
        { crime: "Furto", keywords: [/\bfurto\b/i, /\bart\.?\s*155\b/i] },
        { crime: "Drogas/Trafico", keywords: [/\btr[áa]fico\b/i, /\bentorpecente\b/i, /\bdrogas\b/i, /\bart\.?\s*33\b/i] },
        { crime: "Violencia domestica", keywords: [/\bmaria\s+da\s+penha\b/i, /\bviol[êe]ncia\s+dom[ée]stica\b/i] },
        { crime: "Crimes Sexuais (Estupro)", keywords: [/\bestupro\b/i, /\blasc[íi]via\b/i, /\bdignidade\s+sexual\b/i, /\bestupro\s+de\s+vulner[áa]vel\b/i] },
        { crime: "Armas", keywords: [/\barma\s+de\s+fogo\b/i, /\bporte\s+ilegal\b/i, /\bposse\s+de\s+arma\b/i] },
        { crime: "Estelionato", keywords: [/\bestelionato\b/i, /\bfraude\b/i, /\bart\.?\s*171\b/i] },
        { crime: "Receptação", keywords: [/\brecepta[çc][ãa]o\b/i, /\bart\.?\s*180\b/i] },
        { crime: "Ameaça/Injuria/Briga/Lesão", keywords: [/\bamea[çc]a\b/i, /\binj[úu]ria\b/i, /\bdifama[çc][ãa]o\b/i, /\bkalan[úu]nia\b/i] },
        { crime: "Crimes de Trânsito", keywords: [/\btr[âa]nsito\b/i, /\bcodingo\s+de\s+transito\b/i, /\bembriaguez\b/i] },
    ];

    for (const rule of specificRules) {
        if (rule.keywords.some(kw => kw.test(text))) {
            // Se encontrou "pensão" ou "alimentos", verifica se não é apenas o nome da vara
            if (rule.crime === "Pensão alimenticia") {
                // Se só tem "alimentos" mas tem "roubo" ou "tráfico" em algum lugar, ignora alimentos
                if (/\broubo\b|\btr[áa]fico\b|\bhomic[íi]dio\b/i.test(text)) continue;

                // Se a palavra aparecer apenas no começo (primeiros 500 chars - cabeçalho da Vara) e não houver palavras de execução
                const first500 = text.substring(0, 500).toLowerCase();
                const totalOccurrences = (text.toLowerCase().match(/alimentos/g) || []).length;
                if (totalOccurrences === 1 && first500.includes('alimentos') && !/\bexecu[çc][ãa]o\b|\bd[ée]bito\b|\bd[íi]vida\b|\bpris[ãa]o\s+civil\b/i.test(text)) {
                    continue;
                }
            }
            return rule.crime;
        }
    }

    return 'Outros';
};

const extractRegime = (text: string, category: 'prison' | 'search', crime: string): string => {
    // Limpar o texto de termos que geram falsos positivos de regime
    let cleanTextForRegime = text.replace(/Pol[íi]cia\s+Civil/gi, '---')
        .replace(/Justi[çc]a\s+Civil/gi, '---')
        .replace(/C[íi]vel/gi, '---');

    const lowerText = cleanTextForRegime.toLowerCase();

    // Regra para Busca e Apreensão: permite Audiência de Justificativa ou padrão Localização
    if (category === 'search') {
        if (/\baudi[êe]ncia\s+de\s+justificativa\b/i.test(text)) {
            return "Audiência de Justificativa";
        }
        return 'Localização';
    }

    // Regra especial: se for Pensão Alimenticia, o regime é Civil
    if (crime === "Pensão alimenticia") return "Civil";

    const regimeRules = [
        { label: "Fechado", pattern: /\bfechado\b/i },
        { label: "Semiaberto", pattern: /\bsemiaberto\b|\bsemi-aberto\b/i },
        { label: "Aberto", pattern: /\baberto\b/i },
        { label: "Preventiva", pattern: /\bpreventiva\b/i },
        { label: "Temporária", pattern: /\btempor[áa]ria\b/i },
        { label: "Contramandado", pattern: /\bcontramandado\b/i },
    ];

    for (const rule of regimeRules) {
        if (rule.pattern.test(lowerText)) return rule.label;
    }

    // Se mencionar Civil isolado (e não for Polícia Civil)
    if (/\bcivil\b/i.test(lowerText)) return "Civil";

    return 'Outro';
};

const extractObservations = (text: string): string => {
    const results: string[] = [];
    const patterns = [
        { label: 'Prazo', regex: /Prazo da Prisão[:\s]+([^;\n]{1,100})/i },
        { label: 'Dívida', regex: /Valor da Dívida de Alimentos[:\s]+([^;\n]{1,100})/i },
        { label: 'Atualização', regex: /Data da Atualização da Dívida[:\s]+([^;\n]{1,100})/i },
        { label: 'Ofício DIG', regex: /(?:Of[íi]cio\s+DIG|DIG-nº)[:\s]+([^;\n]{1,50})/i },
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
        { label: 'Uso de Arma de Fogo', regex: /(arma de fogo|pistola|revolver|fuzil)/gi },
        { label: 'Organização Criminosa', regex: /(pcc\b|comando vermelho|fac[çc][ãa]o criminosa|integrante de organiza[çc][ãa]o)/gi },
        { label: 'Violência Extrema', regex: /(tortura|crueldade|grave amea[çc]a|violencia)/gi },
        { label: 'Tráfico de Grande Porte', regex: /(quilos|laborat[óo]rio|refino|balan[çc]a de precis)/gi }
    ];

    const summary: string[] = [];
    markers.forEach(m => {
        if (m.regex.test(text)) summary.push(m.label);
    });

    // Nova regra: Se houver três ou mais ocorrências de pessoas dentro da "SÍNTESE DA DECISÃO" ou "TEOR DO DOCUMENTO"
    const decisionSectionPattern = /(?:S[ÍI]NTESE\s+DA\s+DECIS[ÃA]O|TEOR\s+DO\s+DOCUMENTO)[:\s]+([\s\S]+?)(?:\n\s*\n|MANDADO|NOME:|$)/i;
    const decisionMatch = text.match(decisionSectionPattern);

    if (decisionMatch && decisionMatch[1]) {
        const decisionText = decisionMatch[1];
        // Conta quantas vezes aparecem palavras que indicam novos réus na lista da decisão
        const personInDecisionMarkers = /(?:R[ÉE]U\(A\)|R[ÉE]U|INVESTIGADO|INDICIADO|QUALIFICADO)[:\s]+/gi;
        const matchesInDecision = decisionText.match(personInDecisionMarkers);

        if (matchesInDecision && matchesInDecision.length >= 3 && !summary.includes('Organização Criminosa')) {
            summary.push('Organização Criminosa');
        }
    }

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

    // Ofício de Cobrança: apenas se houver menção explícita a cobrança/ofício no contexto de alimentos
    if (crime === 'Pensão alimenticia' && (text.toLowerCase().includes('cobrança') || text.toLowerCase().includes('ofício'))) {
        tags.push('Ofício de Cobrança');
    }

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
        const birthDate = extractBirthDate(fullText);
        const processNumber = extractProcessNumber(fullText);
        const { issueDate, expirationDate } = extractDates(fullText);
        const addresses = extractAddresses(fullText);
        const { type, category } = determineMandadoType(fullText);
        const crime = extractCrime(fullText);
        const regime = extractRegime(fullText, category, crime);

        const tacticalSummary = extractTacticalSummary(fullText);
        const observations = extractObservations(fullText);

        // Append tactical summary to observations
        const fullObservations = tacticalSummary.length > 0
            ? `${observations} | Atenção: ${tacticalSummary.join(', ')}`
            : observations;

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
            observations: fullObservations,
            tacticalSummary,
            searchChecklist: extractSearchChecklist(fullText, category),
            autoPriority: determineAutoPriority(fullText, crime),
            birthDate,
            age: calculateAge(birthDate)
        };
    } catch (error: any) {
        console.error('Erro detalhado ao extrair PDF:', error);
        throw new Error(`Falha ao processar o PDF: ${error.message || 'Verifique se o arquivo é válido.'}`);
    }
};

// Function to extract text only for analysis
export const extractRawTextFromPdf = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }
        return fullText;
    } catch (error: any) {
        console.error('Erro ao extrair texto bruto do PDF:', error);
        throw new Error("Falha ao ler o arquivo PDF.");
    }
};

// Function to extract from text input
export const extractFromText = (text: string, sourceName: string): ExtractedData => {
    const name = extractName(text);
    const rg = extractRG(text);
    const cpf = extractCPF(text);
    const birthDate = extractBirthDate(text);
    const processNumber = extractProcessNumber(text);
    const { issueDate, expirationDate = new Date().toISOString().split('T')[0] } = extractDates(text);
    const addresses = extractAddresses(text);
    const { type, category } = determineMandadoType(text);
    const crime = extractCrime(text);
    const regime = extractRegime(text, category, crime);
    const tacticalSummary = extractTacticalSummary(text);
    const observations = extractObservations(text);

    // Append tactical summary to observations
    const fullObservations = tacticalSummary.length > 0
        ? `${observations} | Atenção: ${tacticalSummary.join(', ')}`
        : observations;

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
        observations: fullObservations,
        tacticalSummary,
        searchChecklist: extractSearchChecklist(text, category),
        autoPriority: determineAutoPriority(text, crime),
        birthDate,
        age: calculateAge(birthDate)
    };
};
