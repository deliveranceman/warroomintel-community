-- Migration: add_resources_slug_with_backfill
-- Adds a collision-safe slug column to resources and backfills all existing rows.

-- 1. Add nullable slug column (safe to re-run)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS slug text;

-- 2. Backfill collision-safe slugs from title
WITH slug_base AS (
  SELECT
    id,
    regexp_replace(
      regexp_replace(
        lower(trim(title)),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    ) AS raw_slug
  FROM resources
),
slug_cleaned AS (
  SELECT
    id,
    regexp_replace(
      regexp_replace(raw_slug, '-+', '-', 'g'),
      '^-|-$', '', 'g'
    ) AS slug_base
  FROM slug_base
),
slug_ranked AS (
  SELECT
    r.id,
    sc.slug_base,
    ROW_NUMBER() OVER (
      PARTITION BY sc.slug_base
      ORDER BY r.created_at NULLS LAST, r.id
    ) AS rn
  FROM resources r
  JOIN slug_cleaned sc ON sc.id = r.id
)
UPDATE resources r
SET slug = CASE
  WHEN sr.rn = 1 THEN sr.slug_base
  ELSE sr.slug_base || '-' || sr.rn
END
FROM slug_ranked sr
WHERE r.id = sr.id;

-- 3. Unique index — partial (skips nulls, safe for future rows with no slug yet)
CREATE UNIQUE INDEX IF NOT EXISTS resources_slug_unique_idx
  ON resources(slug)
  WHERE slug IS NOT NULL;
