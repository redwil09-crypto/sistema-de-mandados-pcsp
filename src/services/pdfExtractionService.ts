
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker to load from CDN to avoid build setup issues with Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extracts raw text from a PDF file.
 * Useful for feeding content into AI analysis.
 */
export const extractPdfData = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += `--- PÁGINA ${i} ---\n${pageText}\n\n`;
        }

        return fullText;
    } catch (error) {
        console.error("PDF Extraction Error:", error);
        throw new Error("Falha ao ler conteúdo do PDF. O arquivo pode estar corrompido ou protegido.");
    }
};
