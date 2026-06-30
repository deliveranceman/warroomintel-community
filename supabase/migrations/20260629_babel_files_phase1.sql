-- ============================================================
-- BABEL FILES PHASE 1 — Schema
-- 20260629_babel_files_phase1.sql
--
-- DO NOT RUN without operator approval.
-- Creates 10 new tables. Does NOT touch existing extraction
-- tables (cultural_dossiers, secret_societies, curses).
-- search_tsv: GENERATED ALWAYS AS STORED (mirrors spirits).
-- embedding: plain vector(1536), populated on first admin save
--   via reembedArtifactAfterWrite (mirrors reembedSpiritAfterWrite).
-- HNSW index: vector_cosine_ops, m=16, ef_construction=64
--   (mirrors spirits_embedding_hnsw_idx exactly).
-- RLS: enabled on all 10 tables, no policies. Service role
--   bypasses RLS automatically (BYPASSRLS attribute).
-- ============================================================


-- ── 1. artifact_types ────────────────────────────────────────────────────────

CREATE TABLE public.artifact_types (
  code          text        PRIMARY KEY,
  display_name  text        NOT NULL,
  babel_brand   text        NOT NULL,
  icon          text,
  sort_order    int         DEFAULT 100
);

INSERT INTO public.artifact_types (code, display_name, babel_brand, icon, sort_order) VALUES
  ('movie',            'Movie',              'Babel Cinema',     '🎬',  10),
  ('tv_show',          'TV Show',            'Babel Broadcast',  '📺',  20),
  ('anime',            'Anime',              'Babel Broadcast',  '🎌',  25),
  ('book',             'Book',               'Babel Codex',      '📖',  30),
  ('music',            'Music',              'Babel Beats',      '🎵',  40),
  ('game',             'Game',               'Babel Games',      '🎮',  50),
  ('symbol',           'Symbol',             'Babel Symbols',    '👁',  60),
  ('practice',         'Practice',           'Babel Symbols',    '🔮',  65),
  ('person',           'Person',             'Babel Figures',    '🧑',  70),
  ('secret_society',   'Secret Society',     'Babel Societies',  '🏛',  80),
  ('event',            'Event',              'Babel Current',    '📅',  90),
  ('organization',     'Organization',       'Babel Societies',  '🏢',  92),
  ('government_body',  'Government Body',    'Babel Current',    '🏛',  94),
  ('location',         'Location',           'Babel Current',    '📍',  96),
  ('mythology',        'Mythology',          'Babel Mythos',     '⚡',  100),
  ('religion',         'Religion',           'Babel Beliefs',    '✝',  110);


-- ── 2. artifacts ─────────────────────────────────────────────────────────────

CREATE TABLE public.artifacts (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text        NOT NULL UNIQUE,
  name                 text        NOT NULL,
  artifact_type        text        NOT NULL REFERENCES public.artifact_types(code),
  aliases              text,
  summary              text,
  body                 text,
  caution_level        int         CHECK (caution_level BETWEEN 1 AND 5),
  caution_note         text,
  first_appearance     text,
  origin               text,
  status               text        DEFAULT 'active'
                                   CHECK (status IN ('active','historical','dormant','disputed')),
  classification       text        DEFAULT 'unclassified'
                                   CHECK (classification IN (
                                     'unclassified','intelligence_only',
                                     'confirmed','unverified','redacted')),
  intelligence_only    boolean     DEFAULT false,
  details              jsonb       DEFAULT '{}'::jsonb,
  subject_image_url    text,
  og_image_url         text,
  share_count          int         DEFAULT 0,
  compiled_by          text        DEFAULT 'manual',
  sources_count        int         DEFAULT 0,
  published            boolean     DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  created_by           text,

  -- SEARCH — generated always as stored, mirrors spirits.search_tsv weight pattern
  -- name/aliases = A (highest), summary = B, body/caution_note/origin = C
  search_tsv           tsvector    GENERATED ALWAYS AS (
                                     setweight(to_tsvector('english', COALESCE(name, '')),         'A') ||
                                     setweight(to_tsvector('english', COALESCE(aliases, '')),       'A') ||
                                     setweight(to_tsvector('english', COALESCE(summary, '')),       'B') ||
                                     setweight(to_tsvector('english', COALESCE(body, '')),          'C') ||
                                     setweight(to_tsvector('english', COALESCE(caution_note, '')), 'C') ||
                                     setweight(to_tsvector('english', COALESCE(origin, '')),        'C')
                                   ) STORED,

  -- EMBEDDING — plain column; reembedArtifactAfterWrite populates on save
  embedding            vector(1536),
  embedding_source_text text,
  embedding_updated_at  timestamptz
);

-- GIN on search_tsv (mirrors spirits_search_tsv_idx)
CREATE INDEX artifacts_search_tsv_gin
  ON public.artifacts USING gin(search_tsv);

-- HNSW on embedding — mirrors spirits_embedding_hnsw_idx exactly
CREATE INDEX artifacts_embedding_hnsw_idx ON artifacts
  USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);

-- Composite for list-view queries (type filter + published gate + caution sort)
CREATE INDEX artifacts_type_published_caution
  ON public.artifacts (artifact_type, published, caution_level);

-- Slug lookups (single-dossier fetch)
CREATE INDEX artifacts_slug_idx
  ON public.artifacts (slug);

-- GIN on details for per-type jsonb queries
CREATE INDEX artifacts_details_gin
  ON public.artifacts USING gin(details);


-- ── 3. artifact_relationships ────────────────────────────────────────────────

CREATE TABLE public.artifact_relationships (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_artifact_id  uuid        NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  to_artifact_id    uuid        NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  relationship_type text        NOT NULL
                                CHECK (relationship_type IN (
                                  'member_of','founded','influenced_by','influenced',
                                  'depicts','derived_from','successor_of','predecessor_of',
                                  'associated_with','authored','featured_in',
                                  'symbol_of','practice_of','connected_to')),
  notes             text,
  confidence        int         DEFAULT 5 CHECK (confidence BETWEEN 1 AND 5),
  created_at        timestamptz DEFAULT now(),

  UNIQUE (from_artifact_id, to_artifact_id, relationship_type)
);

CREATE INDEX artifact_relationships_from_idx ON public.artifact_relationships (from_artifact_id);
CREATE INDEX artifact_relationships_to_idx   ON public.artifact_relationships (to_artifact_id);


-- ── 4. artifact_spirits ──────────────────────────────────────────────────────

CREATE TABLE public.artifact_spirits (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id  uuid        NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  spirit_id    uuid        NOT NULL REFERENCES public.spirits(id) ON DELETE CASCADE,
  relevance    text,
  notes        text,
  confidence   int         DEFAULT 5 CHECK (confidence BETWEEN 1 AND 5),
  created_at   timestamptz DEFAULT now(),

  UNIQUE (artifact_id, spirit_id)
);

CREATE INDEX artifact_spirits_artifact_idx ON public.artifact_spirits (artifact_id);
CREATE INDEX artifact_spirits_spirit_idx   ON public.artifact_spirits (spirit_id);


-- ── 5. artifact_scriptures ───────────────────────────────────────────────────

CREATE TABLE public.artifact_scriptures (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id  uuid        NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  reference    text        NOT NULL,
  application  text,
  sort_order   int         DEFAULT 100,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX artifact_scriptures_artifact_idx ON public.artifact_scriptures (artifact_id);


-- ── 6. artifact_resources ────────────────────────────────────────────────────

CREATE TABLE public.artifact_resources (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id  uuid        NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  resource_id  uuid        NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  relevance    text,
  created_at   timestamptz DEFAULT now(),

  UNIQUE (artifact_id, resource_id)
);

CREATE INDEX artifact_resources_artifact_idx  ON public.artifact_resources (artifact_id);
CREATE INDEX artifact_resources_resource_idx  ON public.artifact_resources (resource_id);


-- ── 7. artifact_traditions ───────────────────────────────────────────────────

CREATE TABLE public.artifact_traditions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id  uuid        NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  tradition    text        NOT NULL,
  role         text,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX artifact_traditions_artifact_idx   ON public.artifact_traditions (artifact_id);
CREATE INDEX artifact_traditions_tradition_idx  ON public.artifact_traditions (tradition);


-- ── 8. artifact_media ────────────────────────────────────────────────────────

CREATE TABLE public.artifact_media (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id       uuid        NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  media_type        text        NOT NULL
                                CHECK (media_type IN (
                                  'youtube','vimeo','audio','image','external_link')),
  url               text        NOT NULL,
  embed_id          text,
  title             text,
  caption           text,
  caution_note      text,
  intelligence_only boolean     DEFAULT false,
  sort_order        int         DEFAULT 100,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX artifact_media_artifact_idx ON public.artifact_media (artifact_id);


-- ── 9. artifact_extraction_sources (Path A join table) ───────────────────────
--
-- No FK to source tables — they are heterogeneous. App code verifies source
-- row exists before linking; periodic cleanup handles orphans. This is
-- intentional per the Path A architecture decision (Jun 29 2026).

CREATE TABLE public.artifact_extraction_sources (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id  uuid        NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  source_table text        NOT NULL
                           CHECK (source_table IN (
                             'cultural_dossiers','secret_societies',
                             'curses','library_chunks')),
  source_row_id uuid       NOT NULL,
  relevance    text,
  notes        text,
  created_at   timestamptz DEFAULT now(),

  UNIQUE (artifact_id, source_table, source_row_id)
);

CREATE INDEX artifact_extraction_sources_artifact_idx
  ON public.artifact_extraction_sources (artifact_id);

CREATE INDEX artifact_extraction_sources_source_idx
  ON public.artifact_extraction_sources (source_table, source_row_id);


-- ── 10. artifact_candidates (staging table for Phase 2 SOL Recon) ────────────

CREATE TABLE public.artifact_candidates (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            uuid,
  raw_extraction       jsonb,
  proposed_name        text,
  proposed_type        text,
  existing_artifact_id uuid        REFERENCES public.artifacts(id) ON DELETE SET NULL,
  status               text        DEFAULT 'pending'
                                   CHECK (status IN (
                                     'pending','approved','rejected','merged')),
  confidence           int         CHECK (confidence BETWEEN 1 AND 5),
  reviewer_notes       text,
  created_at           timestamptz DEFAULT now(),
  reviewed_at          timestamptz,
  reviewed_by          text
);

CREATE INDEX artifact_candidates_status_idx ON public.artifact_candidates (status);
CREATE INDEX artifact_candidates_type_idx   ON public.artifact_candidates (proposed_type);


-- ── 11. RLS — enable on all 10 tables (no policies; service role bypasses) ───

ALTER TABLE public.artifact_types               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_relationships       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_spirits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_scriptures          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_resources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_traditions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_media               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_extraction_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_candidates          ENABLE ROW LEVEL SECURITY;
