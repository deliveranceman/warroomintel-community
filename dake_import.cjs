const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const raw = JSON.parse(fs.readFileSync('dake_notes_final.json', 'utf8'));
  
  // Deduplicate — keep last occurrence of each book+chapter+verse
  const seen = new Map();
  for (const entry of raw) {
    const key = `${entry.book}|${entry.chapter}|${entry.verse}`;
    seen.set(key, entry);
  }
  const entries = Array.from(seen.values());
  console.log(`${raw.length} raw records → ${entries.length} after dedup`);

  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const { error } = await supabase
      .from('bible_notes')
      .upsert(batch, { onConflict: 'book,chapter,verse' });

    if (error) {
      console.error(`\nError at batch ${i}:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write(`\r  ${inserted} / ${entries.length}`);
  }

  console.log('\nDone!');
  const { count } = await supabase
    .from('bible_notes')
    .select('*', { count: 'exact', head: true });
  console.log(`Total in DB: ${count}`);
}

main().catch(console.error);
