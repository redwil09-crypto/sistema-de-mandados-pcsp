
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ExtractionResult {
  number: string | null;
  fullIdentifier: string | null;
}

export async function extractDocumentNumberFromPdf(
  url: string
): Promise<ExtractionResult> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    const patterns = [
      // "Ofício: nº.029/DIG/2026" - full identifier
      /of[ií]cio[:\s]*n[ºo]\.?\s*(\d+)\s*\/\s*DIG\s*\/\s*(\d{4})/i,
      // "Relatório nº.056/DIG/2026"
      /relat[óo]rio[:\s]*n[ºo]\.?\s*(\d+)\s*\/\s*DIG\s*\/\s*(\d{4})/i,
      // "nº.029/DIG/2026" or "nº 056/DIG/2026"
      /n[ºo]\.?\s*(\d+)\s*\/\s*DIG\s*\/\s*(\d{4})/i,
      // "029/DIG/2026" - standalone
      /(\d+)\s*\/\s*DIG\s*\/\s*(\d{4})/i,
      // Just the number after "nº"
      /n[ºo]\.?\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match) {
        if (match[2]) {
          return {
            number: match[1],
            fullIdentifier: `${match[1]}/DIG/${match[2]}`
          };
        }
        return {
          number: match[1],
          fullIdentifier: match[1]
        };
      }
    }

    return { number: null, fullIdentifier: null };
  } catch (error) {
    console.error(`Erro ao extrair número do documento de ${url}:`, error);
    return { number: null, fullIdentifier: null };
  }
}

export async function extractMultipleDocumentNumbers(
  urls: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<Record<string, ExtractionResult>> {
  const results: Record<string, ExtractionResult> = {};
  const concurrencyLimit = 3;
  const batches = [];

  for (let i = 0; i < urls.length; i += concurrencyLimit) {
    batches.push(urls.slice(i, i + concurrencyLimit));
  }

  let processed = 0;
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const result = await extractDocumentNumberFromPdf(url);
        return { url, result };
      })
    );

    for (const { url, result } of batchResults) {
      results[url] = result;
    }

    processed += batch.length;
    onProgress?.(processed, urls.length);
  }

  return results;
}
