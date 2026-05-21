
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

    interface PatternHandler {
      regex: RegExp;
      format: (match: RegExpMatchArray) => { number: string; fullIdentifier: string } | null;
    }

    const patternHandlers: PatternHandler[] = [
      // "Ofício: nº.029/DIG/2026" - full identifier com DIG
      {
        regex: /(?:of[ií]cio|mandado|relat[óo]rio|documento)[:\s]*n[ºo]\.?\s*(\d+)\s*\/\s*DIG\s*\/\s*(\d{4})/i,
        format: (m) => ({ number: m[1], fullIdentifier: `${m[1]}/DIG/${m[2]}` })
      },
      // "nº.029/DIG/2026" or "nº 056/DIG/2026"
      {
        regex: /n[ºo]\.?\s*(\d+)\s*\/\s*DIG\s*\/\s*(\d{4})/i,
        format: (m) => ({ number: m[1], fullIdentifier: `${m[1]}/DIG/${m[2]}` })
      },
      // "029/DIG/2026" - standalone
      {
        regex: /(\d+)\s*\/\s*DIG\s*\/\s*(\d{4})/i,
        format: (m) => ({ number: m[1], fullIdentifier: `${m[1]}/DIG/${m[2]}` })
      },
      // "Ofício nº 029/2026" - sem DIG
      {
        regex: /(?:of[ií]cio|mandado|relat[óo]rio|documento)[:\s]*n[ºo]\.?\s*(\d+)\s*\/\s*(\d{4})/i,
        format: (m) => ({ number: m[1], fullIdentifier: `${m[1]}/${m[2]}` })
      },
      // "nº XXX/YYYY" (qualquer ano)
      {
        regex: /n[ºo]\.?\s*(\d+)\s*\/\s*(\d{4})/i,
        format: (m) => ({ number: m[1], fullIdentifier: `${m[1]}/${m[2]}` })
      },
      // "Ofício: nº.029" ou "Relatório nº 056"
      {
        regex: /(?:of[ií]cio|mandado|relat[óo]rio)[:\s]*n[ºo]\.?\s*(\d+)/i,
        format: (m) => ({ number: m[1], fullIdentifier: m[1] })
      },
      // "Proc. nº XXX" ou "Processo nº XXX.YYY/ZZ"
      {
        regex: /(?:proc|processo)[^\d]*n[ºo]\.?\s*([\d\.\/\-]+)/i,
        format: (m) => ({ number: m[1], fullIdentifier: m[1].trim() })
      },
      // Just the number after "nº"
      {
        regex: /n[ºo]\.?\s*(\d+)/i,
        format: (m) => ({ number: m[1], fullIdentifier: m[1] })
      },
      // Número avulso com formato "XXX/DIG/YYYY" sem "nº"
      {
        regex: /(\d{3})\s*\/\s*DIG\s*\/\s*(\d{4})/i,
        format: (m) => ({ number: m[1], fullIdentifier: `${m[1]}/DIG/${m[2]}` })
      },
    ];

    for (const handler of patternHandlers) {
      const match = fullText.match(handler.regex);
      if (match) {
        const result = handler.format(match);
        if (result) return result;
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
