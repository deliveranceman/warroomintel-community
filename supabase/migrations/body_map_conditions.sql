-- ============================================================================
-- Body Map Conditions — author condition/manifestation ingest layer (v1)
-- Run manually in Supabase (SQL editor). Idempotent: IF NOT EXISTS / ON CONFLICT
-- DO NOTHING so re-running is safe. Backend (service role) gates all access;
-- RLS denies anon/authenticated by design (matches spirit_body_map_v2).
--
-- Commit 1 of the conditions pipeline: schema + two new anatomy regions only.
-- Ingest endpoint is commit 2; enrich/apply land in a later commit.
-- ============================================================================

-- ── NEW ANATOMY REGIONS ─────────────────────────────────────────────────────
-- These earn real markers. Placeholder coords (% of the 0–100 region box);
-- fine-tune live via admin "Calibrate Markers". Same column shape as the
-- existing 74 regions.
INSERT INTO anatomy_regions
  (region_key, display_name, spiritual_tag, category, body_side, view, sex, x_percent, y_percent, sort_order)
VALUES
  ('sinuses',     'Sinuses',     'Hidden pressure — buried grief and unshed tears',        'head_face', 'center', 'front', 'both', 50.0,  9.0, 19),
  ('gallbladder', 'Gallbladder', 'Stored bitterness — harbored resentment and old gall',   'organ',     'right',  'front', 'both', 46.0, 29.0, 47)
ON CONFLICT (region_key) DO NOTHING;

INSERT INTO region_systems (region_key, system_key) VALUES
  ('sinuses',     'respiratory'),
  ('gallbladder', 'digestive')
ON CONFLICT (region_key, system_key) DO NOTHING;

-- ── conditions ──────────────────────────────────────────────────────────────
-- One row per author condition/manifestation entry. `system` keeps the author's
-- free-text label (ingest never fails on an odd label); `system_key` is the
-- normalized FK, set only when it cleanly matches one of the 12 body_systems.
CREATE TABLE IF NOT EXISTS conditions (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  condition_key     text UNIQUE NOT NULL,        -- slug, e.g. 'migraine', 'thyroid_dysfunction'
  display_name      text NOT NULL,
  system            text,                        -- author's system label, free text
  system_key        text REFERENCES body_systems(system_key),  -- normalized FK; nullable
  symptoms          text,
  author_conclusion text DEFAULT '',             -- author's spiritual/emotional root (dossier seed)
  spiritual_tags    text[] DEFAULT '{}',
  source_strength   smallint CHECK (source_strength BETWEEN 1 AND 5),
  source_note       text,                        -- provenance / original strength label (High/Medium/Low)
  enriched_overview text,                        -- filled only after admin approves an enrich suggestion
  active            boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

-- ── condition_regions ───────────────────────────────────────────────────────
-- Many-to-many condition ↔ region. Systemic conditions (whole-body, immune,
-- blood, etc.) intentionally have NO row here.
CREATE TABLE IF NOT EXISTS condition_regions (
  condition_key      text REFERENCES conditions(condition_key) ON DELETE CASCADE,
  region_key         text REFERENCES anatomy_regions(region_key) ON DELETE CASCADE,
  relevance_strength smallint CHECK (relevance_strength BETWEEN 1 AND 5) DEFAULT 3,
  PRIMARY KEY (condition_key, region_key)
);
CREATE INDEX IF NOT EXISTS idx_cond_region_region ON condition_regions(region_key);

-- ── condition_enrichment_suggestions (staging; enrich/apply land later) ──────
-- AI never writes live data. Proposed dossier + spirit correlations land here
-- as status='pending' and are promoted by a separate apply endpoint on approval.
CREATE TABLE IF NOT EXISTS condition_enrichment_suggestions (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  condition_key         text REFERENCES conditions(condition_key) ON DELETE CASCADE,
  proposed_overview     text,
  proposed_correlations jsonb DEFAULT '[]',      -- [{spirit_name, airtable_record_id, region_key, correlation_strength, rationale}]
  confidence            smallint,
  model                 text,
  status                text DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_by            text,                    -- clerk userId
  created_at            timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cond_enrich_status ON condition_enrichment_suggestions(status);

-- ── RLS — service-role only (backend gates access; no anon/authenticated read) ─
ALTER TABLE conditions                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_regions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_enrichment_suggestions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role full access" ON conditions;
DROP POLICY IF EXISTS "service role full access" ON condition_regions;
DROP POLICY IF EXISTS "service role full access" ON condition_enrichment_suggestions;

CREATE POLICY "service role full access" ON conditions                       FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service role full access" ON condition_regions                FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service role full access" ON condition_enrichment_suggestions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
