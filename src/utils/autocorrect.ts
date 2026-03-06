
/**
 * Dicionário de correções comuns para o sistema policial.
 * Focado em erros de digitação frequentes e termos técnicos.
 */
const autocorrectMap: Record<string, string> = {
    // Termos Gerais
    "enderoço": "endereço",
    "endereça": "endereço",
    "bairo": "bairro",
    "cidadi": "cidade",
    "estadu": "estado",
    "paiz": "país",
    "atencao": "atenção",
    "investigacao": "investigação",
    "investigaçao": "investigação",
    "detencao": "detenção",
    "detença": "detenção",
    "preso": "preso",
    "prizão": "prisão",
    "prisao": "prisão",
    "mandado": "mandado",
    "mandato": "mandado", // Nota: Mandato é político, Mandado é judicial. No sistema, quase sempre será Mandado.
    "reú": "réu",
    "reu": "réu",
    "polica": "polícia",
    "policia": "polícia",
    "delegacia": "delegacia",
    "escrivao": "escrivão",
    "escrivão": "escrivão",
    "boletim": "boletim",
    "ocorrencia": "ocorrência",
    "ocorrençia": "ocorrência",
    "judiciario": "judiciário",
    "forum": "fórum",
    "punição": "punição",
    "infraçao": "infração",
    "infracao": "infração",
    "tráfico": "tráfico",
    "trafico": "tráfico",
    "entorpecente": "entorpecente",
    "veiculo": "veículo",
    "automovel": "automóvel",
    "caminhao": "caminhão",
    "moto": "moto",
    "motocicleta": "motocicleta",
    "arma": "arma",
    "fogo": "fogo",
    "munição": "munição",
    "municao": "munição",
    "apreensão": "apreensão",
    "apreensao": "apreensão",
    "busca": "busca",
    "captura": "captura",
    "tentativa": "tentativa",
    "homicidio": "homicídio",
    "roubo": "roubo",
    "furto": "furto",
    "estupro": "estupro",
    "lesao": "lesão",
    "corporal": "corporal",
    "violencia": "violência",
    "domestica": "doméstica",
    "execuçao": "execução",
    "execucao": "execução",
    "proçesso": "processo",
    "procesu": "processo",
    "u": "o", // Erro comum de digitação final

    // Abreviações Comuns
    "pvc": "PVC",
    "dp": "DP",
    "dig": "DIG",
    "dise": "DISE",
    "goe": "GOE",
    "garra": "GARRA",
    "pm": "PM",
    "pc": "PC",
    "prf": "PRF",
    "gcm": "GCM",
    "r.": "Rua",
    "av.": "Avenida",
    "trav.": "Travessa",
    "pça.": "Praça",
    "nº": "nº",
};

/**
 * Aplica a autocorreção silenciosa ao texto.
 * Baseado no conceito de "word boundaries" (espaços ou pontuação).
 */
export const applyAutocorrect = (text: string): string => {
    if (!text) return text;

    // Se o texto termina com espaço ou pontuação, tentamos corrigir a última palavra
    const isTriggerChar = /[\s,.!?;:]$/.test(text);
    if (!isTriggerChar) return text;

    const words = text.split(/([\s,.!?;:])/);

    // Pegamos a última "palavra" (penúltimo elemento se o último for o separador)
    const lastWordIndex = words.length - 2;
    if (lastWordIndex < 0) return text;

    const lastWord = words[lastWordIndex];
    if (!lastWord) return text;

    const lowerWord = lastWord.toLowerCase();

    if (autocorrectMap[lowerWord]) {
        // Mantém a capitalização original se possível
        const correction = autocorrectMap[lowerWord];
        let finalizedCorrection = correction;

        if (lastWord === lastWord.toUpperCase()) {
            finalizedCorrection = correction.toUpperCase();
        } else if (lastWord[0] === lastWord[0].toUpperCase()) {
            finalizedCorrection = correction[0].toUpperCase() + correction.slice(1);
        }

        words[lastWordIndex] = finalizedCorrection;
        return words.join('');
    }

    return text;
};

/**
 * Normaliza nomes próprios (Capitalização).
 */
export const capitalizeName = (name: string): string => {
    if (!name) return name;
    return name
        .toLowerCase()
        .split(' ')
        .map(word => {
            if (word.length <= 2 && /^(da|de|do|das|dos|e)$/.test(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};
