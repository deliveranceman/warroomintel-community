export default async function handler(req: Request) {
  const headers = { 'Content-Type': 'application/json' }
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  const body = await req.json()
  const { fileName, fileType, fileData } = body

  if (!fileData) return new Response(JSON.stringify({ error: 'No file data' }), { status: 400, headers })

  let extractedText = ''

  try {
    const isImage = fileType?.startsWith('image/') || /\.(png|jpg|jpeg)$/i.test(fileName || '')
    const isPDF = fileType === 'application/pdf' || (fileName || '').endsWith('.pdf')
    const isDoc = /\.(docx?|doc)$/i.test(fileName || '')

    if (isImage || isPDF) {
      const mediaType = isImage ? (fileType || 'image/png') : 'application/pdf'
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              {
                type: isPDF ? 'document' : 'image',
                source: { type: 'base64', media_type: mediaType, data: fileData },
              },
              {
                type: 'text',
                text: 'This is a ministry assessment intake form. Extract ALL the content — every question, answer, checkbox, and free text response — as plain text. Preserve all answers faithfully. Do not summarize. Output only the extracted content, no preamble.',
              },
            ],
          }],
        }),
      })
      const claudeData = await claudeRes.json()
      extractedText = claudeData.content?.[0]?.text || ''
    } else if (isDoc) {
      const decoded = Buffer.from(fileData, 'base64').toString('utf-8', 0, 50000)
      extractedText = decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000)
      if (extractedText.length < 100) {
        return new Response(JSON.stringify({ error: 'Could not read DOCX. Try saving as PDF and uploading that instead.' }), { status: 400, headers })
      }
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
