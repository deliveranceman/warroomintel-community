// scripts/create-intel-tables.mjs
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const tables = [
  { name: 'intel_posts', sql: `
CREATE TABLE IF NOT EXISTS intel_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  scripture text,
  post_type text DEFAULT 'briefing',
  author_name text DEFAULT 'Pastor Justin',
  stream_channel_id text,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE intel_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_intel_posts" ON intel_posts FOR SELECT USING (published = true);` },
  { name: 'intel_links', sql: `
CREATE TABLE IF NOT EXISTS intel_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  note text,
  source text,
  tier_required text DEFAULT 'Free',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE intel_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "public_read_intel_links" ON intel_links FOR SELECT USING (active = true);` },
  { name: 'field_reports', sql: `
CREATE TABLE IF NOT EXISTS field_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by_id text NOT NULL,
  submitted_by_name text NOT NULL,
  location_city text,
  location_state text,
  spirit_names text NOT NULL,
  manifestations text NOT NULL,
  entry_points text,
  outcome text,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "approved_read_field_reports" ON field_reports FOR SELECT USING (status = 'approved');` },
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
    process.exit(1);
  }

  console.log('⚔ Checking Intel tables via Supabase...\n');

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}?limit=1`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      });
      if (res.ok) {
        console.log(`✅ ${table.name} — exists`);
      } else {
        console.log(`⚠️  ${table.name} — needs creation. Run this SQL:\n${table.sql}\n---`);
      }
    } catch (e) {
      console.error(`❌ ${table.name}: ${e.message}`);
    }
  }

  console.log('\nDone. Run any missing SQL at:');
  console.log('https://supabase.com/dashboard/project/uurfiasxtcvdpkfosofn/sql');
}

main();
