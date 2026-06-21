import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpiritDossier } from './spiritTypes'

const STUB_THRESHOLD = 100  // chars

/**
 * Fetch full dossier (spirit + fan-out) for each spirit_id.
 * Parallel queries — same architectural pattern as admin-dashboard-stats.
 * is_adversarial is read from library_enrichment_suggestions, NOT from
 * resources (per b7258726 hotfix lesson).
 */
export async function hydrateDossiers(
  supabase: SupabaseClient,
  spiritIds: string[]
): Promise<SpiritDossier[]> {
  if (spiritIds.length === 0) return []

  const [
    spiritsRes,
    gatewaysRes,
    scripturesRes,
    hierarchyRes,
    companionsRes,
    regionsRes,
    conditionsRes,
    arsenalLeadsRes,
  ] = await Promise.all([
    supabase
      .from('spirits')
      .select('id, name, slug, aka, equivalents, description')
      .in('id', spiritIds),

    supabase
      .from('spirit_gateways')
      .select(`
        spirit_id, gateway, notes,
        library_enrichment_suggestions!source_suggestion_id (
          is_adversarial,
          resources ( title )
        )
      `)
      .in('spirit_id', spiritIds),

    supabase
      .from('spirit_scriptures')
      .select('spirit_id, reference, kind, text_note')
      .in('spirit_id', spiritIds),

    // Hierarchy: this spirit can appear as child OR parent.
    // Fetch both directions in parallel via two queries.
    Promise.all([
      supabase
        .from('spirit_hierarchy')
        .select(`
          child_spirit_id, parent_spirit_id, parent_name_raw, relation,
          parent:parent_spirit_id ( name )
        `)
        .in('child_spirit_id', spiritIds),
      supabase
        .from('spirit_hierarchy')
        .select(`
          child_spirit_id, parent_spirit_id, parent_name_raw, relation,
          child:child_spirit_id ( name )
        `)
        .in('parent_spirit_id', spiritIds),
    ]),

    supabase
      .from('spirit_companions')
      .select(`
        spirit_id, companion_spirit_id, companion_name_raw, kind,
        companion:companion_spirit_id ( name )
      `)
      .in('spirit_id', spiritIds),

    supabase
      .from('spirit_regions')
      .select('spirit_id, region_key, manifestation_type, correlation_strength')
      .in('spirit_id', spiritIds),

    supabase
      .from('spirit_conditions')
      .select('spirit_id, condition_key, relationship, notes')
      .in('spirit_id', spiritIds),

    supabase
      .from('arsenal_leads')
      .select('spirit_id, lead_type, content, confidence, notes')
      .in('spirit_id', spiritIds),
  ])

  // Defensive: any query failing throws, but partial data should still hydrate
  if (spiritsRes.error) throw spiritsRes.error

  const spiritsRows = spiritsRes.data ?? []
  const gatewaysRows = gatewaysRes.data ?? []
  const scripturesRows = scripturesRes.data ?? []
  const [parentRows, childRows] = hierarchyRes  // tuple from Promise.all
  const companionsRows = companionsRes.data ?? []
  const regionsRows = regionsRes.data ?? []
  const conditionsRows = conditionsRes.data ?? []
  const arsenalLeadsRows = arsenalLeadsRes.data ?? []

  return spiritsRows.map((s: any): SpiritDossier => {
    const description = s.description ?? ''
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      aka: s.aka
        ? s.aka.split(/[,;]/).map((t: string) => t.trim()).filter(Boolean)
        : [],
      equivalents: s.equivalents,
      description,
      is_stub: description.length < STUB_THRESHOLD,
      gateways: gatewaysRows
        .filter((g: any) => g.spirit_id === s.id)
        .map((g: any) => ({
          gateway: g.gateway,
          notes: g.notes,
          source_title: g.library_enrichment_suggestions?.resources?.title ?? null,
          isAdversarial: g.library_enrichment_suggestions?.is_adversarial ?? null,
        })),
      scriptures: scripturesRows
        .filter((sc: any) => sc.spirit_id === s.id)
        .map((sc: any) => ({
          reference: sc.reference,
          kind: sc.kind,
          textNote: sc.text_note,
        })),
      hierarchy: {
        // Rows where this spirit is the CHILD → parents
        parents: ((parentRows?.data ?? []) as any[])
          .filter((r) => r.child_spirit_id === s.id)
          .map((r) => ({
            relation: r.relation,
            other_name: r.parent?.name ?? r.parent_name_raw ?? '(unknown)',
          })),
        // Rows where this spirit is the PARENT → children
        children: ((childRows?.data ?? []) as any[])
          .filter((r) => r.parent_spirit_id === s.id)
          .map((r) => ({
            relation: r.relation,
            other_name: r.child?.name ?? '(unknown)',
          })),
      },
      companions: companionsRows
        .filter((c: any) => c.spirit_id === s.id)
        .map((c: any) => ({
          other_name: c.companion?.name ?? c.companion_name_raw ?? '(unknown)',
          kind: c.kind,
        })),
      regions: regionsRows
        .filter((r: any) => r.spirit_id === s.id)
        .map((r: any) => ({
          region_key: r.region_key,
          manifestation_type: r.manifestation_type,
          strength: r.correlation_strength,
        })),
      conditions: conditionsRows
        .filter((c: any) => c.spirit_id === s.id)
        .map((c: any) => ({
          condition_key: c.condition_key,
          relationship: c.relationship,
          notes: c.notes,
        })),
      arsenalLeads: arsenalLeadsRows
        .filter((a: any) => a.spirit_id === s.id)
        .map((a: any) => ({
          lead_type: a.lead_type,
          content: a.content,
          confidence: a.confidence,
          notes: a.notes,
        })),
    }
  })
}

/**
 * Format dossiers into a single text block suitable for injection
 * into a SOL system / context message. Matches the structure laid out
 * in admin_doc 661f5fd2 §5.
 *
 * opts.anonymize (default false) — per admin_doc 661f5fd2 §13. When true,
 * gateway source lines render as a generic class marker
 * ('📖 ministry source' / '🕯️ intelligence source') instead of the actual
 * book title, so SOL never surfaces source attribution to the user. The
 * operator-facing test endpoint (/admin/intel/sol-test) leaves this false
 * to keep full attribution visible for debugging.
 */
export function formatDossiersForContext(
  dossiers: SpiritDossier[],
  opts: { anonymize?: boolean } = {}
): string {
  const anonymize = opts.anonymize === true
  if (dossiers.length === 0) return ''

  const blocks: string[] = ['=== WRI ARCHIVE ===']

  for (const d of dossiers) {
    const lines: string[] = []
    lines.push(`\n--- ${d.name.toUpperCase()}${d.is_stub ? ' (stub — invite operator to expand)' : ''} ---`)

    if (d.aka.length > 0) {
      lines.push(`Aliases: ${d.aka.join(' · ')}`)
    }
    if (d.equivalents && d.equivalents.trim()) {
      lines.push(`Cross-cultural equivalents:\n${d.equivalents.trim()}`)
    }

    lines.push(`\nDescription:\n${d.description || '(no description recorded)'}`)

    if (d.gateways.length > 0) {
      lines.push(`\nGateways (${d.gateways.length}):`)
      for (const g of d.gateways) {
        const src = g.source_title
          ? (anonymize
              ? ` — source: ${g.isAdversarial ? '🕯️ intelligence source' : '📖 ministry source'}`
              : ` — source: ${g.isAdversarial ? '🕯️ ' : '📖 '}${g.source_title}`)
          : ''
        lines.push(`  - ${g.gateway}${src}`)
        if (g.notes) lines.push(`      ${g.notes}`)
      }
    }

    if (d.scriptures.length > 0) {
      lines.push(`\nScriptures (${d.scriptures.length}):`)
      for (const sc of d.scriptures) {
        const note = sc.textNote ? ` — ${sc.textNote.slice(0, 200)}` : ''
        lines.push(`  - ${sc.reference} (${sc.kind})${note}`)
      }
    }

    if (d.hierarchy.parents.length > 0 || d.hierarchy.children.length > 0) {
      lines.push(`\nNetwork:`)
      for (const p of d.hierarchy.parents) {
        lines.push(`  - ${p.relation} of: ${p.other_name}`)
      }
      for (const c of d.hierarchy.children) {
        lines.push(`  - ${c.relation} over: ${c.other_name}`)
      }
    }

    if (d.companions.length > 0) {
      lines.push(`\nCompanions (${d.companions.length}):`)
      for (const c of d.companions.slice(0, 15)) {  // cap at 15
        lines.push(`  - ${c.other_name}${c.kind ? ` (${c.kind})` : ''}`)
      }
      if (d.companions.length > 15) {
        lines.push(`  ... and ${d.companions.length - 15} more`)
      }
    }

    if (d.regions.length > 0) {
      lines.push(`\nBody Regions:`)
      for (const r of d.regions) {
        lines.push(`  - ${r.region_key}${r.manifestation_type ? ` — ${r.manifestation_type}` : ''}`)
      }
    }

    if (d.conditions.length > 0) {
      lines.push(`\nConditions / Manifestations (${d.conditions.length}):`)
      for (const c of d.conditions) {
        const rel = c.relationship ? `[${c.relationship}] ` : ''
        const note = c.notes ? ` — ${c.notes.slice(0, 200)}` : ''
        lines.push(`  - ${rel}${c.condition_key}${note}`)
      }
    }

    if (d.arsenalLeads.length > 0) {
      lines.push(`\nArsenal Leads (${d.arsenalLeads.length}):`)
      for (const a of d.arsenalLeads.slice(0, 10)) {
        const conf = a.confidence != null ? ` [conf:${a.confidence}]` : ''
        const note = a.notes ? ` — ${a.notes.slice(0, 150)}` : ''
        lines.push(`  - [${a.lead_type}]${conf} ${a.content.slice(0, 200)}${note}`)
      }
      if (d.arsenalLeads.length > 10) {
        lines.push(`  ... and ${d.arsenalLeads.length - 10} more`)
      }
    }

    blocks.push(lines.join('\n'))
  }

  blocks.push('\n=== END WRI ARCHIVE ===')
  return blocks.join('\n')
}
