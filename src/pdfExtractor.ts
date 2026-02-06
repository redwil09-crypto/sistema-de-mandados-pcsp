// Imports seguros usando Named Imports para compatibilidade total com Vite/PDF.js v4
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';

// Configuração do Worker via CDN (estratégia à prova de falhas locais)
// Usamos o version importado diretamente para garantir match exato
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

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
    tacticalSummary?: string;   // New: Periculosidade/Modus Operandi (JSON string)
    autoPriority?: string[];    // New: Sugestão de tags
    searchChecklist?: string[];  // New: Itens para busca
    isDuplicate?: boolean;      // New: Verificação de duplicidade
    birthDate?: string;         // New: Data de Nascimento
    age?: string;               // New: Idade calculada
    issuingCourt?: string;      // New: Fórum/Vara Expedidora
}

// ... Helper functions (mantidas pelo contexto do arquivo, não alteradas aqui)

// Main extraction function
export const extractPdfData = async (file: File): Promise<ExtractedData> => {
    try {
        let fullText = '';
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.pdf')) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                // Uso direto do getDocument importado
                const loadingTask = getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;

                // Extract text from all pages
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items
                        .map((item: any) => item.str)
                        .join(' ');
                    fullText += pageText + '\n';
                }
            } catch (pdfError: any) {
                console.error("PDF.js Core Error:", pdfError);
                throw new Error("Erro interno ao decodificar PDF. O arquivo pode estar corrompido ou ter senha.");
            }
        } else if (fileName.endsWith('.docx')) {
            const mammoth = await import('mammoth');
            const arrayBuffer = await file.arrayBuffer();
            // @ts-ignore
            const result = await mammoth.extractRawText({ arrayBuffer });
            fullText = result.value;
        } else {
            // Fallback for text files or unknown
            fullText = await file.text();
        }

// Parse extracted text (Lógica inalterada)
