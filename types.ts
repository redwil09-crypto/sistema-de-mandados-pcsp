
export interface Warrant {
    id: string;
    name: string;
    type: string; // Keep for display compatibility (Header title usually)
    location?: string;
    number: string;
    status: string;
    img?: string | null;
    priority?: string;
    age?: string;
    rg?: string;
    description?: string; // Keep for compatibility
    timestamp?: string;

    // New fields for advanced filtering
    crime?: string;
    regime?: string;
    observation?: string;

    // Detailed View Fields
    cpf?: string;
    issueDate?: string;      // Data de Expedição
    entryDate?: string;      // Data de Entrada na Capturas
    expirationDate?: string; // Data do Vencimento
    dischargeDate?: string;  // Data da Baixa

    ifoodNumber?: string;    // Oficio IFOOD nº
    ifoodResult?: string;    // Resultado IFOOD
    digOffice?: string;      // Ofício DIG

    reports?: string[];      // Relatórios (1,2,3...)
    attachments?: string[];  // Anexos
    date?: string;           // Compatibility date field
    tags?: string[];         // Priority tags
    fulfillmentResult?: string; // Resultado do cumprimento (Fechado, Aberto, etc)
    fulfillmentReport?: string; // Número do relatório
    createdAt?: string;         // Data de criação no banco
    updatedAt?: string;         // Data de atualização no banco
    diligentHistory?: DiligentEntry[]; // Linha do tempo de investigação
}

export interface DiligentEntry {
    id: string;
    date: string;
    investigator: string;
    notes: string;
    type: 'observation' | 'attempt' | 'intelligence';
}

export interface StatData {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
}

export interface ChartData {
    name: string;
    emitted?: number;
    completed?: number;
    pending?: number;
    value?: number;
    color?: string;
    [key: string]: string | number | undefined;
}

export interface PieData {
    name: string;
    value: number;
    color: string;
    [key: string]: string | number | undefined;
}