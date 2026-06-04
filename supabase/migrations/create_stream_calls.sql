CREATE TABLE IF NOT EXISTS stream_calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id text UNIQUE NOT NULL,
  call_type text NOT NULL DEFAULT 'audio_room',
  channel_id text NOT NULL,
  caller_id text NOT NULL,
  caller_name text NOT NULL DEFAULT '',
  recipient_id text NOT NULL,
  status text NOT NULL DEFAULT 'ringing',
  created_at timestamptz DEFAULT now(),
  answered_at timestamptz,
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS stream_calls_recipient_idx ON stream_calls(recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS stream_calls_channel_idx ON stream_calls(channel_id);
ALTER TABLE stream_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON stream_calls USING (true) WITH CHECK (true);
