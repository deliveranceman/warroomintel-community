export function mimeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || ''
  switch (ext) {
    case 'pdf':  return 'application/pdf'
    case 'txt':  return 'text/plain'
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'doc':  return 'application/msword'
    default:     return 'application/octet-stream'
  }
}
