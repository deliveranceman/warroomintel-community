// Static Vite ?url import — resolves to hashed asset path at build time
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export interface ExtractResult {
  text: string
  warnings: string[]
}

export async function extractText(file: File): Promise<ExtractResult> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.txt'))  return extractTextFromTxt(file)
  if (lower.endsWith('.docx')) return extractTextFromDocx(file)
  if (lower.endsWith('.pdf'))  return extractTextFromPdf(file)
  throw new Error(`Unsupported file type: ${file.name}`)
}

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuf = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function extractTextFromTxt(file: File): Promise<ExtractResult> {
  const text = await file.text()
  return { text, warnings: [] }
}

async function extractTextFromDocx(file: File): Promise<ExtractResult> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return {
    text: result.value,
    warnings: result.messages.map((m: any) => m.message),
  }
}

async function extractTextFromPdf(file: File): Promise<ExtractResult> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
  const pdf = await loadingTask.promise

  const warnings: string[] = []
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(pageText)
  }

  await loadingTask.destroy()

  return { text: pages.join('\n\n'), warnings }
}
