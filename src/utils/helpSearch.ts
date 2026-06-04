import { helpArticles, type HelpArticle } from '../data/helpContent'

export function searchHelp(query: string): HelpArticle[] {
  if (!query.trim()) return []

  const q = query.toLowerCase().trim()
  const terms = q.split(' ').filter(t => t.length > 1)

  const scored = helpArticles.map(article => {
    let score = 0

    if (article.title.toLowerCase().includes(q)) score += 10
    terms.forEach(t => {
      if (article.title.toLowerCase().includes(t)) score += 5
    })

    article.keywords.forEach(kw => {
      if (kw.includes(q)) score += 8
      terms.forEach(t => {
        if (kw.includes(t)) score += 3
      })
    })

    if (article.content.toLowerCase().includes(q)) score += 4
    terms.forEach(t => {
      if (article.content.toLowerCase().includes(t)) score += 1
    })

    return { article, score }
  })

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(s => s.article)
}

export function getArticlesByCategory(category: string): HelpArticle[] {
  return helpArticles.filter(a => a.category === category)
}
