CREATE TABLE IF NOT EXISTS ai_search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  context JSONB DEFAULT '{}',
  saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE ai_search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own history" ON ai_search_history
  FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS ai_search_history_user_idx ON ai_search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_search_history_tool_idx ON ai_search_history(user_id, tool, created_at DESC);
