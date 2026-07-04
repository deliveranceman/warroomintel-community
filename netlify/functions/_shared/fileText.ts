// Shared file-text extraction helper — pdfjs-dist + mammoth + TextDecoder + Mistral OCR fallback.
// Called by admin-library-save.mts and assessment-upload.ts so the fix lives in one place.
// PDF-PARSE IS PERMANENTLY BANNED — never import it here or anywhere.
// @napi-rs/canvas IS DEAD (won't load in Lambda) — never import it here or anywhere.

import { createRequire } from 'module'
import { ocrPdfWithMistral } from './mistralOcr'

const MAX_CHARS = 120_000  // matches admin-library-save limit

export interface FileTextResult {
  text:    string
  method:  'pdfjs' | 'mammoth' | 'text' | 'none' | 'mistral-ocr' | 'ocr-failed'
  pages?:  number   // set when method='mistral-ocr'; pages_processed from Mistral
  error?:  string   // set when method='ocr-failed'; Mistral error message
}

// Fix A: pdfjs-dist v6 references DOMMatrix / Path2D even for text-only extraction in Node.js.
// Stub them out globally so pdfjs doesn't crash before we can fall through to Mistral OCR.
function installPolyfills() {
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    ;(globalThis as any).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
      m11 = 1; m12 = 0; m13 = 0; m14 = 0
      m21 = 0; m22 = 1; m23 = 0; m24 = 0
      m31 = 0; m32 = 0; m33 = 1; m34 = 0
      m41 = 0; m42 = 0; m43 = 0; m44 = 1
      is2D = true; isIdentity = true
      constructor(_init?: string | number[]) {}
      multiply(_other?: any) { return new (globalThis as any).DOMMatrix() }
      inverse() { return new (globalThis as any).DOMMatrix() }
      translate(_tx = 0, _ty = 0) { return new (globalThis as any).DOMMatrix() }
      scale(_sx = 1, _sy = 1) { return new (globalThis as any).DOMMatrix() }
      rotate(_angle = 0) { return new (globalThis as any).DOMMatrix() }
      transformPoint(_p?: any) { return _p ?? { x: 0, y: 0, z: 0, w: 1 } }
      toFloat32Array() { return new Float32Array([1, 0, 0, 1, 0, 0]) }
      toFloat64Array() { return new Float64Array([1, 0, 0, 1, 0, 0]) }
      toString() { return 'matrix(1,0,0,1,0,0)' }
    }
  }
  if (typeof (globalThis as any).Path2D === 'undefined') {
    ;(globalThis as any).Path2D = class Path2D {
      constructor(_path?: string | any) {}
      addPath() {}; arc() {}; arcTo() {}; bezierCurveTo() {}
      closePath() {}; ellipse() {}; lineTo() {}; moveTo() {}
      quadraticCurveTo() {}; rect() {}
    }
  }
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

  // ── PDF ───────────────────────────────────────────────────────────────────
  if (ext === 'pdf') {
    installPolyfills()

    // Fix B: track pdfjs success separately so a crash falls through to Mistral OCR.
    let pdfjsText = ''
    let pdfjsOk   = false

    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs') as any

      // Fix A: resolve the worker file via createRequire so Node worker_threads can load it.
      // Falls back to a relative URL when bundled by esbuild (may still fail — Fix B catches it).
      const _req = createRequire(import.meta.url)
      try {
        GlobalWorkerOptions.workerSrc = _req.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
      } catch {
        GlobalWorkerOptions.workerSrc = new URL(
          '../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url,
        ).href
      }

      const loadingTask = getDocument({
        data:            new Uint8Array(buffer),
        disableFontFace: true,
        useSystemFonts:  false,
        isEvalSupported: false,
        disableRange:    true,
        disableStream:   true,
      })
      const pdfDoc = await loadingTask.promise
      const pageTexts: string[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page    = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        pageTexts.push((content.items as any[]).map((item: any) => item.str || '').join(' '))
      }
      const extracted = pageTexts.join('\n\n').trim()
      pdfjsOk   = extracted.length >= 50
      pdfjsText = extracted
    } catch (e: any) {
      // warn, not error — Mistral OCR will handle it below
      console.warn('[fileText] pdfjs failed, falling through to Mistral OCR:', e?.message)
    }

    if (pdfjsOk) return { text: pdfjsText.slice(0, MAX_CHARS), method: 'pdfjs' }

    // pdfjs yielded < 50 chars (scanned) OR crashed → Mistral OCR
    try {
      const { text: ocrText, pages: ocrPages } = await ocrPdfWithMistral(buffer.toString('base64'))
      if (ocrText.length >= 50) {
        return { text: ocrText.slice(0, MAX_CHARS), method: 'mistral-ocr', pages: ocrPages }
      }
      return { text: '', method: 'none' }
    } catch (e: any) {
      console.error('[fileText] Mistral OCR failed:', e?.message)
      return { text: '', method: 'ocr-failed', error: e?.message ?? 'OCR failed' }
    }
  }

  return { text: '', method: 'none' }
}
