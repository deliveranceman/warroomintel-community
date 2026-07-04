// Shared file-text extraction helper — pdfjs-dist + mammoth + TextDecoder + Mistral OCR fallback.
// Called by admin-library-save.mts and assessment-upload.ts so the fix lives in one place.
// PDF-PARSE IS PERMANENTLY BANNED — never import it here or anywhere.
// @napi-rs/canvas IS DEAD (won't load in Lambda) — never import it here or anywhere.

import { ocrPdfWithMistral } from './mistralOcr'

const MAX_CHARS = 120_000  // matches admin-library-save limit

export interface FileTextResult {
  text:    string
  method:  'pdfjs' | 'mammoth' | 'text' | 'none' | 'mistral-ocr' | 'ocr-failed'
  pages?:  number   // set when method='mistral-ocr'; pages_processed from Mistral
  error?:  string   // set when method='ocr-failed'; Mistral error message
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  _mimeType?: string,
): Promise<FileTextResult> {
  const ext = (filename.toLowerCase().split('.').pop() || '').trim()

  // ── TXT ──────────────────────────────────────────────────────────────────
  if (ext === 'txt') {
    const text = new TextDecoder('utf-8').decode(buffer).replace(/\0/g, ' ').slice(0, MAX_CHARS)
    return { text, method: 'text' }
  }

  // ── DOCX / DOC (mammoth) ─────────────────────────────────────────────────
  if (ext === 'docx' || ext === 'doc') {
    try {
      const { createRequire } = await import('module')
      const req     = createRequire(import.meta.url)
      const mammoth = req('mammoth')
      const result  = await mammoth.extractRawText({ buffer })
      const text    = ((result.value as string) || '').slice(0, MAX_CHARS)
      return { text, method: 'mammoth' }
    } catch (e: any) {
      console.error('[fileText] mammoth error:', e?.message)
      return { text: '', method: 'none' }
    }
  }

  // ── PDF (pdfjs-dist, Lambda main-thread mode) ─────────────────────────────
  if (ext === 'pdf') {
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs') as any
      GlobalWorkerOptions.workerSrc = ''
      const loadingTask = getDocument({ data: new Uint8Array(buffer) })
      const pdfDoc = await loadingTask.promise
      const pages: string[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page    = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        const pageText = (content.items as any[]).map((item: any) => item.str || '').join(' ')
        pages.push(pageText)
      }
      const text = pages.join('\n\n').trim().slice(0, MAX_CHARS)
      if (text.length < 50) {
        // Scanned / image-only PDF — no text layer. Try Mistral OCR (single call, server-side).
        try {
          const { text: ocrText, pages: ocrPages } = await ocrPdfWithMistral(buffer.toString('base64'))
          if (ocrText.length >= 50) {
            return { text: ocrText.slice(0, MAX_CHARS), method: 'mistral-ocr', pages: ocrPages }
          }
          // OCR ran but returned nothing meaningful — document is truly unreadable.
          return { text: '', method: 'none' }
        } catch (e: any) {
          console.error('[fileText] Mistral OCR failed:', e?.message)
          return { text: '', method: 'ocr-failed', error: e?.message ?? 'OCR failed' }
        }
      }
      return { text, method: 'pdfjs' }
    } catch (e: any) {
      console.error('[fileText] pdfjs error:', e?.message)
      return { text: '', method: 'none' }
    }
  }

  return { text: '', method: 'none' }
}
