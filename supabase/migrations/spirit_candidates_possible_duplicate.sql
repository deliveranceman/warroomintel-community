ALTER TABLE spirit_candidates
  ADD COLUMN possible_duplicate_of text,
  ADD COLUMN possible_duplicate_confidence smallint
    CHECK (possible_duplicate_confidence BETWEEN 1 AND 5);

COMMENT ON COLUMN spirit_candidates.possible_duplicate_of IS
  'Spirit slug that this candidate MAY be a variant of (set by tier-3 word-boundary classifier). Requires human confirmation before merge -- NEVER auto-merge (taxonomy trap: Aesma Daeva != Daeva).';

CREATE INDEX spirit_candidates_possible_duplicate_of_idx
  ON spirit_candidates(possible_duplicate_of)
  WHERE possible_duplicate_of IS NOT NULL;

-- Backfill: 55 pending candidates flagged at confidence 3 (flat — every match requires human review).
-- Longest spirit-name match wins when a candidate contains multiple known spirit names.
UPDATE spirit_candidates sc
SET possible_duplicate_of = matched.slug,
    possible_duplicate_confidence = 3
FROM (
  SELECT DISTINCT ON (sc_inner.id)
    sc_inner.id AS candidate_id,
    s.slug,
    length(s.name) AS match_length
  FROM spirit_candidates sc_inner
  CROSS JOIN spirits s
  WHERE sc_inner.status = 'pending'
    AND sc_inner.possible_duplicate_of IS NULL
    AND LOWER(sc_inner.name) ~ ('(^|\s)' || LOWER(s.name) || '($|\s)')
    AND LOWER(sc_inner.name) <> LOWER(s.name)
    AND length(s.name) >= 4
  ORDER BY sc_inner.id, length(s.name) DESC
) matched
WHERE sc.id = matched.candidate_id;
