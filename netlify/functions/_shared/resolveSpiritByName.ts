// Shared spirit-name resolution for Layer 3 fan-out helpers.
// Tries exact case-insensitive name match first, then slug match
// (space→dash, lowercase). Returns the spirit UUID or null.
// Two queries by design — avoids PostgREST .or() string injection risk
// when names contain special characters.

export async function resolveSpiritByName(
  client: any,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const slugGuess = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  // 1. Exact case-insensitive name match
  const { data: byName } = await client
    .from('spirits')
    .select('id')
    .ilike('name', trimmed)
    .limit(1)
  if (byName && byName.length > 0) return (byName[0] as any).id as string

  // 2. Slug match (space→dash, lowercase)
  if (slugGuess) {
    const { data: bySlug } = await client
      .from('spirits')
      .select('id')
      .eq('slug', slugGuess)
      .limit(1)
    if (bySlug && bySlug.length > 0) return (bySlug[0] as any).id as string
  }

  return null
}
