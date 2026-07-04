import { requireTier } from './_shared/access'
import { extractTextFromFile } from './_shared/fileText'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  const auth = await requireTier(req, 1)
  if (auth instanceof Response) return auth

  const body = await req.json()
  const { fileName, fileType, fileData } = body

  if (!fileData) return new Response(JSON.stringify({ error: 'No file data' }), { status: 400, headers })

  // Phase-1A probe — send fileData='__probe__' to verify @napi-rs/canvas deploys (remove after confirmed)
  if (fileData === '__probe__') {
    const results: Record<string, unknown> = {}
    try {
      const { createCanvas } = await import('@napi-rs/canvas')
      const canvas = createCanvas(200, 200)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'rgb(10, 20, 30)'
      ctx.fillRect(0, 0, 200, 200)
      ctx.fillStyle = 'white'
      ctx.fillRect(10, 10, 50, 50)
      const pngBuf = canvas.toBuffer('image/png')
      results.canvas = { ok: true, bytes: pngBuf.length }
      console.log('[OCR-PROBE] @napi-rs/canvas OK — PNG bytes:', pngBuf.length)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      results.canvas = { ok: false, error: msg.slice(0, 500) }
      console.error('[OCR-PROBE] @napi-rs/canvas FAILED:', msg)
    }
    return new Response(JSON.stringify({ probe: true, results }), { status: 200, headers })
  }

  let extractedText = ''

  try {
    const isImage = (fileType as string | undefined)?.startsWith('image/') || /\.(png|jpg|jpeg)$/i.test(fileName || '')
    const isPDF   = fileType === 'application/pdf' || /\.pdf$/i.test(fileName || '')

    if (isImage) {
      // Claude vision — works correctly, no beta header needed, keep unchanged
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: fileType || 'image/png', data: fileData } },
              { type: 'text', text: 'This is a ministry assessment intake form. Extract ALL the content — every question, answer, checkbox, and free text response — as plain text. Preserve all answers faithfully. Do not summarize. Output only the extracted content, no preamble.' },
            ],
          }],
        }),
      })
      const claudeData = await claudeRes.json()
      extractedText = claudeData.content?.[0]?.text || ''
    } else {
      // PDF → pdfjs-dist  |  DOCX/DOC → mammoth  |  TXT → TextDecoder
      const buffer = Buffer.from(fileData as string, 'base64')
      const { text, method } = await extractTextFromFile(buffer, fileName || '', fileType as string | undefined)
      if (method === 'ocr-failed') {
        return new Response(JSON.stringify({
          error: "OCR couldn't read this PDF (it may be too large, too slow, or corrupted). Try splitting it into fewer pages, or paste the text with Fill Out Now.",
        }), { status: 400, headers })
      }
      if (method === 'none' || !text) {
        if (isPDF) {
          return new Response(JSON.stringify({
            error: "Couldn't read this PDF — it may be a scanned image. Please paste the text using \"Fill Out Now\", upload a .txt or .docx, or upload a clear photo of the pages.",
          }), { status: 400, headers })
        }
        return new Response(JSON.stringify({ error: 'Could not extract text from this file. Please try a different format.' }), { status: 400, headers })
      }
      extractedText = text
    }

    if (!extractedText || extractedText.length < 50) {
      return new Response(JSON.stringify({ error: 'Could not extract text from the file. Please try a PDF or clear photo.' }), { status: 400, headers })
    }

    return new Response(JSON.stringify({ extractedText, charCount: extractedText.length }), { status: 200, headers })
  } catch {
    return new Response(JSON.stringify({ error: 'File processing failed' }), { status: 500, headers })
  }
}

export const config = { path: '/api/assessment-upload' }
