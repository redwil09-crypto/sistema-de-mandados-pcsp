export const normalizeCrimeName = (crime: string): string => {
    if (!crime) return 'Outros';

    let normalized = crime.toUpperCase();
    let finalCrime = '';

    // 1. Agrupar Pensão Alimentícia
    if (
        normalized.includes('PENSÃO') ||
        normalized.includes('PENSAO') ||
        normalized.includes('ALIMENTÍC') ||
        normalized.includes('ALIMENTIC') ||
        normalized.includes('ALIMENTOS') ||
        normalized.includes('DÍVIDA') ||
        (normalized.includes('CIVIL') && normalized.includes('PRIS'))
    ) {
        finalCrime = 'PENSÃO ALIMENTÍCIA';
    }
    // 3. Normalizações de Crimes Comuns para nomes únicos
    else if (normalized.includes('TRÁFICO') || normalized.includes('TRAFICO') || normalized.includes('ENTORPECENTES') || normalized.includes('DROGAS') || normalized.includes('33') || normalized.includes('35')) {
        finalCrime = 'TRÁFICO DE DROGAS';
    }
    else if (normalized.includes('ROUBO') || normalized.includes('ASSALTO') || normalized.includes('157')) {
        finalCrime = 'ROUBO';
    }
    else if (normalized.includes('FURTO') || normalized.includes('155')) {
        finalCrime = 'FURTO';
    }
    else if (normalized.includes('HOMICÍDIO') || normalized.includes('HOMICIDIO') || normalized.includes('MATAR') || normalized.includes('ASSASSINATO') || normalized.includes('121')) {
        finalCrime = 'HOMICÍDIO';
    }
    else if (normalized.includes('FEMINICÍDIO') || normalized.includes('FEMINICIDIO')) {
        finalCrime = 'FEMINICÍDIO';
    }
    else if (normalized.includes('MARIA DA PENHA') || normalized.includes('DOMÉSTICA') || normalized.includes('DOMESTICA')) {
        finalCrime = 'VIOLÊNCIA DOMÉSTICA';
    }
    else if (normalized.includes('ESTUPRO') || normalized.includes('LASCÍVIA') || normalized.includes('SEXUAL') || normalized.includes('VULNERÁVEL') || normalized.includes('213') || normalized.includes('217')) {
        finalCrime = 'ESTUPRO DOS CRIMES SEXUAIS'; // será ajustado pelo CamelCase
        finalCrime = 'ESTUPRO / CRIMES SEXUAIS';
    }
    else if (normalized.includes('POSSE') || normalized.includes('PORTE') || normalized.includes('ARMA') || normalized.includes('MUNIÇÃO')) {
        finalCrime = 'POSSE / PORTE DE ARMA';
    }
    else if (normalized.includes('ESTELIONATO') || normalized.includes('FRAUDE') || normalized.includes('171')) {
        finalCrime = 'ESTELIONATO';
    }
    else if (normalized.includes('RECEPTAÇÃO') || normalized.includes('RECEPTACAO') || normalized.includes('180')) {
        finalCrime = 'RECEPTAÇÃO';
    }
    else if (normalized.includes('AMEAÇA') || normalized.includes('AMEACA') || normalized.includes('147')) {
        finalCrime = 'AMEAÇA';
    }
    else if (normalized.includes('EXTORSÃO MEDIANTE SEQUESTRO') || normalized.includes('159')) {
        finalCrime = 'EXTORSÃO MEDIANTE SEQUESTRO';
    }
    else if (normalized.includes('EXTORSÃO') || normalized.includes('158')) {
        finalCrime = 'EXTORSÃO';
    }
    else if (normalized.includes('TRÂNSITO') || normalized.includes('TRANSITO') || normalized.includes('EMBRIAGUEZ') || normalized.includes('302') || normalized.includes('303')) {
        finalCrime = 'CRIMES DE TRÂNSITO';
    }
    else if (normalized.includes('ORGANIZAÇÃO CRIMINOSA') || normalized.includes('ORGANIZACAO') || normalized.includes('QUADRILHA') || normalized.includes('BANDO') || normalized.includes('ASSOCIAÇÃO') || normalized.includes('ASSOCIACAO')) {
        finalCrime = 'ORGANIZAÇÃO CRIMINOSA';
    }
    else if (normalized.includes('DESACATO') || normalized.includes('331')) {
        finalCrime = 'DESACATO';
    }
    else if (normalized.includes('RESISTÊNCIA') || normalized.includes('RESISTENCIA') || normalized.includes('329')) {
        finalCrime = 'RESISTÊNCIA';
    }
    else {
        // 2. Remoção agressiva de Artigos (ex: ART. 33, ARTIGO 157, ART 121, C/C, INCISO, LEI) para crimes livres
        normalized = normalized.replace(/\bART\.?\s*\d+\b/g, '');
        normalized = normalized.replace(/\bARTIGO\s*\d+\b/g, '');
        normalized = normalized.replace(/\bLEI\b[\s\d\.\/]+/g, '');
        normalized = normalized.replace(/\bC\/C\b/g, '');
        normalized = normalized.replace(/\bINCISO\b\s*[IVXLCDM]+/g, '');
        normalized = normalized.replace(/\bCAPUT\b/g, '');
        normalized = normalized.replace(/[\(\)\-]/g, ' '); // remove parênteses e traços

        finalCrime = normalized.trim().replace(/\s{2,}/g, ' ');
    }

    // Se o crime virou uma string muito curta ou vazia
    if (!finalCrime || finalCrime.length < 3) return 'OUTROS';

    return finalCrime.toUpperCase();
};
