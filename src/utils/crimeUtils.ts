export const normalizeCrimeName = (crime: string): string => {
    if (!crime) return 'Outros';

    let normalized = crime.toUpperCase();

    // 1. Agrupar Pensão Alimentícia
    if (
        normalized.includes('PENSÃO') ||
        normalized.includes('PENSAO') ||
        normalized.includes('ALIMENTÍC') ||
        normalized.includes('ALIMENTIC') ||
        normalized.includes('ALIMENTOS') ||
        normalized.includes('DÍVIDA') ||
        normalized.includes('CIVIL') && normalized.includes('PRIS')
    ) {
        return 'PENSÃO ALIMENTÍCIA';
    }

    // 2. Remoção agressiva de Artigos (ex: ART. 33, ARTIGO 157, ART 121, C/C, INCISO, LEI)
    normalized = normalized.replace(/\bART\.?\s*\d+\b/g, '');
    normalized = normalized.replace(/\bARTIGO\s*\d+\b/g, '');
    normalized = normalized.replace(/\bLEI\b[\s\d\.\/]+/g, '');
    normalized = normalized.replace(/\bC\/C\b/g, '');
    normalized = normalized.replace(/\bINCISO\b\s*[IVXLCDM]+/g, '');
    normalized = normalized.replace(/\bCAPUT\b/g, '');
    normalized = normalized.replace(/[\(\)\-]/g, ' '); // remove parênteses e traços

    // 3. Normalizações de Crimes Comuns para nomes únicos
    if (normalized.includes('TRÁFICO') || normalized.includes('TRAFICO') || normalized.includes('ENTORPECENTES') || normalized.includes('DROGAS') || normalized.includes('33')) {
        return 'TRÁFICO DE DROGAS';
    }
    if (normalized.includes('ROUBO') || normalized.includes('ASSALTO') || normalized.includes('157')) {
        return 'ROUBO';
    }
    if (normalized.includes('FURTO') || normalized.includes('155')) {
        return 'FURTO';
    }
    if (normalized.includes('HOMICÍDIO') || normalized.includes('HOMICIDIO') || normalized.includes('MATAR') || normalized.includes('ASSASSINATO') || normalized.includes('121')) {
        return 'HOMICÍDIO';
    }
    if (normalized.includes('FEMINICÍDIO') || normalized.includes('FEMINICIDIO')) {
        return 'FEMINICÍDIO';
    }
    if (normalized.includes('MARIA DA PENHA') || normalized.includes('DOMÉSTICA') || normalized.includes('DOMESTICA')) {
        return 'VIOLÊNCIA DOMÉSTICA';
    }
    if (normalized.includes('ESTUPRO') || normalized.includes('LASCÍVIA') || normalized.includes('SEXUAL') || normalized.includes('VULNERÁVEL') || normalized.includes('213') || normalized.includes('217')) {
        return 'ESTUPRO / CRIMES SEXUAIS';
    }
    if (normalized.includes('POSSE') || normalized.includes('PORTE') || normalized.includes('ARMA') || normalized.includes('MUNIÇÃO')) {
        return 'POSSE/PORTE DE ARMA';
    }
    if (normalized.includes('ESTELIONATO') || normalized.includes('FRAUDE') || normalized.includes('171')) {
        return 'ESTELIONATO';
    }
    if (normalized.includes('RECEPTAÇÃO') || normalized.includes('RECEPTACAO') || normalized.includes('180')) {
        return 'RECEPTAÇÃO';
    }
    if (normalized.includes('AMEAÇA') || normalized.includes('AMEACA') || normalized.includes('147')) {
        return 'AMEAÇA';
    }
    if (normalized.includes('EXTORSÃO MEDIANTE SEQUESTRO') || normalized.includes('159')) {
        return 'EXTORSÃO MEDIANTE SEQUESTRO';
    }
    if (normalized.includes('EXTORSÃO') || normalized.includes('158')) {
        return 'EXTORSÃO';
    }
    if (normalized.includes('TRÂNSITO') || normalized.includes('TRANSITO') || normalized.includes('EMBRIAGUEZ') || normalized.includes('302') || normalized.includes('303')) {
        return 'CRIMES DE TRÂNSITO';
    }
    if (normalized.includes('ORGANIZAÇÃO CRIMINOSA') || normalized.includes('ORGANIZACAO') || normalized.includes('QUADRILHA') || normalized.includes('BANDO') || normalized.includes('ASSOCIAÇÃO') || normalized.includes('ASSOCIACAO')) {
        return 'ORGANIZAÇÃO CRIMINOSA';
    }
    if (normalized.includes('DESACATO') || normalized.includes('331')) {
        return 'DESACATO';
    }
    if (normalized.includes('RESISTÊNCIA') || normalized.includes('RESISTENCIA') || normalized.includes('329')) {
        return 'RESISTÊNCIA';
    }

    // Limpeza final de espaços vazios extras que sobraram
    normalized = normalized.trim().replace(/\s{2,}/g, ' ');

    // Se o crime virou uma string muito curta ou vazia (ex: era só "Art. 33"), e não pegou nas regras acima:
    if (!normalized || normalized.length < 3) return 'OUTROS';

    // Capitalize as first letter, lower rest for better aesthetics like "Roubo", "Furto", etc.
    const toCamelCase = (str: string) => {
        return str.split(' ').map(word => {
            if (word.length <= 2 && word !== 'DA' && word !== 'DE' && word !== 'DO') return word;
            if (['DE', 'DA', 'DO', 'DOS', 'DAS', 'E'].includes(word)) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    };

    return toCamelCase(normalized);
};
