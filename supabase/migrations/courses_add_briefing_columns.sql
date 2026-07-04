-- Additive columns for course briefing rendering (WRI dossier redesign).
-- Both nullable, no defaults, no backfill. Frontend renders when populated,
-- hides when null. Admin editing wired in a later commit.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS scripture_callout text,
  ADD COLUMN IF NOT EXISTS objectives text[];

COMMENT ON COLUMN public.courses.scripture_callout IS
  'Optional Scripture callout rendered as gold-quote block on course landing. Format: verse text followed by reference (e.g. "The Spirit of the Lord is upon me... — Luke 4:18").';

COMMENT ON COLUMN public.courses.objectives IS
  'Optional array of learning objectives rendered as diamond-bullet list on course landing.';
