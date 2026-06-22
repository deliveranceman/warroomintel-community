// Bloodline Intelligence Center — type definitions
// Mirrors schema from migration bloodline_intelligence_center_phase_1_schema
// Per admin_doc 060ff996

export type BloodlineStatus = 'active' | 'closed' | 'paused'
export type Gender = 'M' | 'F' | 'unknown' | null
export type ParentLineage = 'paternal' | 'maternal' | null
export type AbuseType = 'received' | 'perpetrated' | 'both' | 'unknown' | null
export type OathStatus = 'unrenounced' | 'partially_renounced' | 'renounced' | null
export type PatternStrength = 'low' | 'medium' | 'high' | null

export interface BloodlineProfile {
  id: string
  created_by: string
  subject_name: string
  status: BloodlineStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BloodlineProfileShare {
  profile_id: string
  member_id: string
  granted_by: string
  granted_at: string
}

export interface BloodlineAncestor {
  id: string
  profile_id: string
  name: string | null
  gender: Gender
  generation: number | null
  parent_lineage: ParentLineage
  birth_country: string | null
  birth_year: number | null
  death_year: number | null
  occupation: string | null
  religion: string | null
  military_service: string | null
  secret_societies: string[] | null
  known_trauma: string | null
  abuse: AbuseType
  addiction: string | null
  suicide: boolean
  occult_involvement: string | null
  freemasonry_degree: number | null
  lodge_membership: string | null
  notes: string | null
  unknown_fields: string[] | null
  created_at: string
  updated_at: string
}

export interface BloodlineEvent {
  id: string
  profile_id: string
  ancestor_id: string | null
  event_type: string
  event_year: number | null
  event_detail: string | null
  notes: string | null
  created_at: string
}

export interface BloodlineOath {
  id: string
  profile_id: string
  ancestor_id: string | null
  oath_category: string
  oath_detail: string | null
  who_sworn_to: string | null
  year: number | null
  status: OathStatus
  notes: string | null
  created_at: string
}

export interface BloodlinePatternCluster {
  id: string
  profile_id: string
  pattern_name: string
  pattern_strength: PatternStrength
  generational_count: number | null
  supporting_event_ids: string[] | null
  ai_generated: boolean
  confidence_score: number | null
  notes: string | null
  created_at: string
}

export interface CulturalDossier {
  id: string
  culture_name: string
  description: string | null
  historical_practices: string | null
  religious_influences: string | null
  folk_magic: string | null
  secret_societies: string | null
  pagan_practices: string | null
  known_oaths: string | null
  known_rituals: string | null
  source_book: string | null
  source_author: string | null
  source_page: string | null
  embedding: number[] | null
  embedding_source_text: string | null
  embedding_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface SecretSociety {
  id: string
  name: string
  history: string | null
  known_oaths: string | null
  known_symbols: string | null
  known_degrees: string | null
  scriptures: string | null
  ministry_considerations: string | null
  source_book: string | null
  source_author: string | null
  source_page: string | null
  embedding: number[] | null
  embedding_source_text: string | null
  embedding_updated_at: string | null
  created_at: string
  updated_at: string
}
