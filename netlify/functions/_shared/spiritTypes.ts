export type SpiritMatch = {
  id: string
  name: string
  matched_via: 'name' | 'aka'
  matched_token: string
  matchStrength: number   // higher = stronger
}

export type SpiritDossier = {
  id: string
  name: string
  slug: string
  aka: string[]
  equivalents: string | null
  description: string
  is_stub: boolean
  gateways: Array<{
    gateway: string
    notes: string | null
    source_title: string | null
    isAdversarial: boolean | null
  }>
  scriptures: Array<{
    reference: string
    kind: string
    textNote: string | null
  }>
  hierarchy: {
    parents:  Array<{ relation: string, other_name: string }>
    children: Array<{ relation: string, other_name: string }>
  }
  companions: Array<{ other_name: string, kind: string | null }>
  regions: Array<{
    region_key: string
    manifestation_type: string | null
    strength: number | null
  }>
  conditions: Array<{
    condition_key: string
    relationship: string | null
    notes: string | null
  }>
  arsenalLeads: Array<{
    lead_type: string
    content: string
    confidence: number | null
    notes: string | null
  }>
}
