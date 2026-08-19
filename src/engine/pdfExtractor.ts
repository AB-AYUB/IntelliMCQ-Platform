import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Worker setup using unpkg with fallback
const PDFJS_VERSION = pdfjsLib.version || '4.10.38';
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker setup fallback');
}

export interface PDFExtractionOptions {
  onProgress?: (page: number, total: number, stage: 'standard' | 'ocr-init' | 'ocr') => void;
}

export const extractTextFromPDF = async (
  arrayBuffer: ArrayBuffer,
  options?: PDFExtractionOptions
): Promise<string> => {
  let pdf: pdfjsLib.PDFDocumentProxy | null = null;
  
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer.slice(0)),
      useSystemFonts: true,
      stopAtErrors: false
    });
    pdf = await loadingTask.promise;
  } catch (err) {
    console.error('Failed to load PDF document proxy:', err);
    throw new Error('Invalid PDF format or corrupted file.');
  }

  // Stage 1: Attempt standard PDF.js text extraction
  let standardText = '';
  try {
    standardText = await extractWithPDFJS(pdf, options);
    
    // Check if the extracted text is clean and readable (not garbage encoding)
    if (standardText && standardText.length > 30 && !isGarbageText(standardText)) {
      console.log('Standard PDF extraction successful.');
      return standardText;
    } else {
      console.warn('Standard extraction produced garbage encoding or empty text. Falling back to OCR...');
    }
  } catch (err) {
    console.warn('PDF.js Primary extraction failed, falling back to OCR:', err);
  }

  // Stage 2: OCR Fallback (Read the visual image without relying on internal text layers)
  try {
    if (options?.onProgress) options.onProgress(0, pdf.numPages, 'ocr-init');
    const ocrText = await extractWithOCR(pdf, options);
    
    if (ocrText && ocrText.length > 20) {
      return ocrText;
    }
  } catch (err) {
    console.error('OCR Fallback failed:', err);
  }

  throw new Error('Could not extract readable text from this PDF file via text layers or OCR. Please try pasting the text directly using the "Paste Text" tab.');
};

/**
 * Stage 1: PDF.js extraction with page error recovery
 */
const extractWithPDFJS = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  options?: PDFExtractionOptions
): Promise<string> => {
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    if (options?.onProgress) {
      options.onProgress(i, pdf.numPages, 'standard');
    }

    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items as any[]) {
        if ('str' in item && item.str) {
          const str = item.str;
          const currentY = item.transform ? item.transform[5] : null;

          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 6) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !str.startsWith(' ')) {
            pageText += ' ';
          }

          pageText += str;
          if (currentY !== null) lastY = currentY;
        }
      }

      const clean = repairFontArtifacts(pageText);
      if (clean.trim()) {
        fullText += `--- Page ${i} ---\n${clean}\n\n`;
      }
    } catch (pageErr) {
      console.warn(`Error reading page ${i}, skipping:`, pageErr);
    }
  }

  return fullText.trim();
};

/**
 * Stage 2: OCR Extractor (Reads the visual PDF pixels directly)
 * Uses parallel multi-threading and higher scaling for high-speed, high-accuracy scanning.
 */
const extractWithOCR = async (
  pdf: pdfjsLib.PDFDocumentProxy,
  options?: PDFExtractionOptions
): Promise<string> => {
  // Increase limit to 250 pages as requested, supporting deep scans
  const maxPages = Math.min(pdf.numPages, 250); 

  // Determine optimal concurrency (max 6 to avoid browser crash, fallback to 4)
  const MAX_CONCURRENCY = Math.min(navigator.hardwareConcurrency || 4, 6);
  const workers: Tesseract.Worker[] = [];

  if (options?.onProgress) options.onProgress(0, maxPages, 'ocr-init');

  // Initialize first worker to let Tesseract download and cache 'eng+ben' language data safely
  workers.push(await Tesseract.createWorker('eng+ben', 1));

  // Initialize remaining workers in parallel
  if (MAX_CONCURRENCY > 1) {
    const additionalWorkers = await Promise.all(
      Array.from({ length: MAX_CONCURRENCY - 1 }).map(() => 
        Tesseract.createWorker('eng+ben', 1)
      )
    );
    workers.push(...additionalWorkers);
  }

  const results: string[] = new Array(maxPages + 1).fill('');
  let currentPage = 1;
  let completedPages = 0;

  // Worker thread function
  const processNext = async (worker: Tesseract.Worker) => {
    while (currentPage <= maxPages) {
      const pageNum = currentPage++; // Atomically take the next available page
      
      try {
        const page = await pdf.getPage(pageNum);
        // Scale 2.0 provides very high accuracy ("no wrong extraction")
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          // Render PDF page to canvas
          await page.render({ canvasContext: ctx, viewport } as any).promise;

          // Extract text from the rendered canvas image
          const { data: { text } } = await worker.recognize(canvas);
          
          if (text && text.trim()) {
            results[pageNum] = `--- Page ${pageNum} (OCR) ---\n${text.trim()}\n\n`;
          }
        }
      } catch (err) {
        console.warn(`OCR failed on page ${pageNum}:`, err);
      }

      completedPages++;
      if (options?.onProgress) {
        options.onProgress(completedPages, maxPages, 'ocr');
      }
    }
  };

  // Run all workers concurrently
  await Promise.all(workers.map(worker => processNext(worker)));

  // Terminate workers to free up memory
  for (const worker of workers) {
    await worker.terminate();
  }

  // Combine results in correct page order
  const fullText = results.join('');
  return repairFontArtifacts(fullText).trim();
};

/**
 * Detects if the extracted text is heavily corrupted or gibberish (e.g. æÀYb¶Ã+ĐW)
 */
const isGarbageText = (text: string): boolean => {
  if (text.length < 20) return true;
  
  // Count valid English, Bengali, Numbers, and common punctuation characters
  // \u0980-\u09FF is the Bengali unicode block
  const validMatches = text.match(/[a-zA-Z0-9\u0980-\u09FF\s.,?!()\-:;"'/+=]/g);
  if (!validMatches) return true;
  
  const validRatio = validMatches.length / text.length;
  
  // If less than 60% of the characters are standard readable text, it's corrupted encoding
  return validRatio < 0.6;
};

/**
 * Stage 3: Auto-repair broken ligatures and fonts (fi, fl, ffi)
 */
export const repairFontArtifacts = (text: string): string => {
  const clean = text
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Strip hidden control chars
    .replace(/[ \t]+/g, ' '); // Collapse multiple spaces
    
  return clean
    .replace(/[^\x20-\x7E\u0980-\u09FF\s]/g, ' ') // Keep basic ascii and Bengali
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Image OCR Extractor for direct screenshot pasting
 */
export const extractTextFromImage = async (
  fileOrBlob: File | Blob,
  options?: { onProgress?: (msg: string) => void }
): Promise<string> => {
  if (options?.onProgress) options.onProgress('Initializing OCR engine...');
  
  // Single worker for image processing
  const worker = await Tesseract.createWorker('eng+ben', 1, {
    logger: m => {
      if (m.status === 'recognizing text' && options?.onProgress) {
        options.onProgress(`Scanning image... ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  
  try {
    const { data: { text } } = await worker.recognize(fileOrBlob);
    return text;
  } finally {
    await worker.terminate();
  }
};
