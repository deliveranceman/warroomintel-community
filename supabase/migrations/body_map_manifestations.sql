CREATE TABLE body_map_manifestations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotspot_id TEXT NOT NULL,
  body_part TEXT NOT NULL,
  region TEXT NOT NULL,
  manifestation TEXT NOT NULL,
  spirit_names TEXT[] NOT NULL DEFAULT '{}',
  spirit_airtable_ids TEXT[] DEFAULT '{}',
  notes TEXT,
  source TEXT,
  gender TEXT DEFAULT 'both',
  view TEXT DEFAULT 'front',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

CREATE INDEX body_map_hotspot_idx ON body_map_manifestations (hotspot_id);

ALTER TABLE body_map_manifestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read"
  ON body_map_manifestations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access"
  ON body_map_manifestations FOR ALL
  USING (auth.role() = 'service_role');
