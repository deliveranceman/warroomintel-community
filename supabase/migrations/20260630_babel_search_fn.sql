-- ============================================================
-- BABEL FILES — Semantic search RPC
-- 20260630_babel_search_fn.sql
--
-- match_artifacts_semantic: cosine-similarity search over
-- artifact embeddings (vector(1536), text-embedding-3-small).
-- Called by /api/babel/search alongside FTS; results merged
-- and re-scored in application layer (same pattern as spirits).
--
-- Security: SECURITY DEFINER so the service role's BYPASSRLS
-- attribute extends into the function body — no explicit
-- policy needed on artifacts for this call.
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_artifacts_semantic(
  query_embedding  vector(1536),
  match_count      int     DEFAULT 20,
  filter_type      text    DEFAULT ''
)
RETURNS TABLE (
  id               uuid,
  slug             text,
  name             text,
  artifact_type    text,
  classification   text,
  caution_level    int,
  subject_image_url text,
  summary          text,
  similarity       float8
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.slug,
    a.name,
    a.artifact_type,
    a.classification,
    a.caution_level,
    a.subject_image_url,
    a.summary,
    1.0 - (a.embedding <=> query_embedding) AS similarity
  FROM public.artifacts a
  WHERE
    a.published     = true
    AND a.embedding IS NOT NULL
    AND (filter_type = '' OR a.artifact_type = filter_type)
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_artifacts_semantic(vector(1536), int, text) TO service_role;
