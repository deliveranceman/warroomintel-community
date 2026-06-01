CREATE TABLE IF NOT EXISTS content_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_of DATE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'weekly_intel', 'arsenal_pdf', 'daily_brief',
    'field_manual', 'youtube_outline'
  )),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  full_draft TEXT,
  suggested_tier TEXT DEFAULT 'watchman',
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'published'
  )),
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'ai-agent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

ALTER TABLE content_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON content_suggestions FOR ALL USING (true);
