CREATE TABLE IF NOT EXISTS assessment_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymized_assessment text,
  war_strategy text,
  consented boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE assessment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON assessment_logs
  FOR ALL USING (auth.role() = 'service_role');
