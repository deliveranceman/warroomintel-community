CREATE TABLE IF NOT EXISTS fringe_articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text NOT NULL,
  wri_take text,
  tag text DEFAULT 'disclosure',
  source_type text DEFAULT 'article',
  source_url text,
  source_name text,
  significance int DEFAULT 3,
  tier_required text DEFAULT 'free',
  status text DEFAULT 'pending',
  published_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fringe_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published"
  ON fringe_articles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Service role full access"
  ON fringe_articles FOR ALL
  USING (auth.role() = 'service_role');
