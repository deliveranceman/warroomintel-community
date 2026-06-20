/**
 * Triage helpers for LES queue review.
 *
 * Reads layer2_raw._meta + layer6_scripture to derive at-a-glance
 * triage signals. All helpers tolerate null/undefined layer2_raw
 * (legacy pre-Phase-2 LES rows).
 */

export type TriageStatus = 'ready' | 'needs-read' | 'reject-candidate' | 'unknown'
export type Completeness = 'substantial' | 'partial' | 'minimal' | null

export interface LesLike {
  layer2_raw?: any
  is_adversarial?: boolean | null
}

/** Returns true/false/null. NULL = legacy LES without _meta. */
export function getAttested(les: LesLike): boolean | null {
  const v = les?.layer2_raw?._meta?.target_spirit_attested
  if (v === 'true'  || v === true)  return true
  if (v === 'false' || v === false) return false
  return null
}

export function getCompleteness(les: LesLike): Completeness {
  const v = les?.layer2_raw?._meta?.extraction_completeness
  if (v === 'substantial' || v === 'partial' || v === 'minimal') return v
  return null
}

/**
 * Total scripture refs across all four layer6_scripture sub-fields.
 * Useful as a content-density signal.
 */
export function getRefsCount(les: LesLike): number {
  const ls = les?.layer2_raw?.layer6_scripture
  if (!ls) return 0
  const subs = ['scripture', 'counter_scriptures', 'scripture_context', 'biblical_umbrella']
  let total = 0
  for (const k of subs) {
    const refs = ls?.[k]?.refs
    if (Array.isArray(refs)) total += refs.length
  }
  return total
}

/**
 * Triage status:
 *   - 'reject-candidate' if attested=false (spirit not actually in source)
 *   - 'ready'            if attested=true + completeness='substantial'
 *   - 'needs-read'       if attested=true + partial/minimal completeness
 *   - 'unknown'          if no _meta (legacy LES)
 */
export function getTriageStatus(les: LesLike): TriageStatus {
  const att = getAttested(les)
  if (att === false) return 'reject-candidate'
  if (att === null)  return 'unknown'
  const comp = getCompleteness(les)
  if (comp === 'substantial') return 'ready'
  return 'needs-read'
}

/** Boolean: row matches the filter spec. null/'all' = pass-through. */
export interface TriageFilterSpec {
  triageStatus?: TriageStatus | 'all'
  attested?:     'yes' | 'no' | 'unknown' | 'all'
  completeness?: Completeness | 'all'
  sourceClass?:  'ministry' | 'intelligence' | 'all'
  resourceId?:   string | null
}

export function matchesFilter(les: LesLike & { resource_id?: string }, f: TriageFilterSpec): boolean {
  if (f.triageStatus && f.triageStatus !== 'all') {
    if (getTriageStatus(les) !== f.triageStatus) return false
  }
  if (f.attested && f.attested !== 'all') {
    const a = getAttested(les)
    if (f.attested === 'yes'     && a !== true)  return false
    if (f.attested === 'no'      && a !== false) return false
    if (f.attested === 'unknown' && a !== null)  return false
  }
  if (f.completeness && f.completeness !== 'all') {
    if (getCompleteness(les) !== f.completeness) return false
  }
  if (f.sourceClass && f.sourceClass !== 'all') {
    if (f.sourceClass === 'ministry'     && les.is_adversarial !== false) return false
    if (f.sourceClass === 'intelligence' && les.is_adversarial !== true)  return false
  }
  if (f.resourceId && les.resource_id !== f.resourceId) return false
  return true
}
