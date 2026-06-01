export function cleanAIOutput(text: string): string {
  return text
    // Em dashes — replace with comma or hyphen
    .replace(/\s—\s/g, ', ')
    .replace(/—/g, ' - ')
    // En dashes used as separators
    .replace(/\s–\s/g, ', ')
    // AI filler phrases
    .replace(/\bIn conclusion,?\s*/gi, '')
    .replace(/\bTo summarize,?\s*/gi, '')
    .replace(/\bIt is worth noting that\s*/gi, '')
    .replace(/\bIt is important to note that\s*/gi, '')
    .replace(/\bNotably,?\s*/gi, '')
    .replace(/\bFurthermore,?\s*/gi, '')
    .replace(/\bMoreover,?\s*/gi, '')
    .replace(/\bAdditionally,?\s*/gi, '')
    .replace(/\bIn other words,?\s*/gi, '')
    .replace(/\bAs previously mentioned,?\s*/gi, '')
    .replace(/\bAs we can see,?\s*/gi, '')
    .replace(/\bIt goes without saying\s*/gi, '')
    .replace(/\bNeedless to say,?\s*/gi, '')
    .replace(/\bAt the end of the day,?\s*/gi, '')
    .replace(/\bWith that said,?\s*/gi, '')
    .replace(/\bThat being said,?\s*/gi, '')
    .replace(/\bHaving said that,?\s*/gi, '')
    // Double spaces left by replacements
    .replace(/  +/g, ' ')
    // Trailing comma-space artifacts
    .replace(/\s,/g, ',')
    .trim()
}
