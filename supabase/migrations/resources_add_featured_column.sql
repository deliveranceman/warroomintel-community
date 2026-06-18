-- Add featured flag for Arsenal "Pinned" shelf
ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- Partial index: the Pinned shelf query is WHERE featured = true
CREATE INDEX IF NOT EXISTS idx_resources_featured
  ON public.resources (featured)
  WHERE featured = true;
