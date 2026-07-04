// Mistral OCR helper — separate provider from Anthropic (never routes through solClient).
// Used for scanned / image-only PDFs that pdfjs-dist returns no text layer for.
// POST to https://api.mistral.ai/v1/ocr with the PDF as a base64 data-URI document.

export async function ocrPdfWithMistral(
  pdfBase64: string,
): Promise<{ text: string; pages: number }> {
  const key = process.env.MISTRAL_API_KEY
  if (!key) throw new Error('[mistralOcr] MISTRAL_API_KEY not set')

  const res = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${pdfBase64}`,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '(no body)')
    throw new Error(`[mistralOcr] HTTP ${res.status}: ${body.slice(0, 500)}`)
  }

  const data = await res.json()
  const pages: Array<{ markdown?: string }> = data.pages ?? []
  const text = pages.map((p) => p.markdown ?? '').join('\n\n')
  const pageCount: number = data.usage_info?.pages_processed ?? pages.length

  console.log(`[mistralOcr] pages_processed: ${pageCount}, chars: ${text.length}`)

  return { text, pages: pageCount }
}
