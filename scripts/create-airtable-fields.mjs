// scripts/create-airtable-fields.mjs
// Creates new fields in Airtable, then re-runs upsert with all fields
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE_ID = 'appVXEj2DLPBTJTtD';
const TABLE_ID = 'tblcP4lgVykzOhLi4';

const NEW_FIELDS = [
  { name: 'Hierarchy Category', type: 'singleLineText' },
  { name: 'Parent Strongman', type: 'singleLineText' },
  { name: 'Deliverance Sequence', type: 'multilineText' },
  { name: 'Operational Notes', type: 'multilineText' },
  { name: 'Primary Battlefield', type: 'singleLineText' },
  { name: 'Typical Personality Presentation', type: 'singleLineText' },
  { name: 'Counter Scriptures', type: 'multilineText' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function createField(field) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: field.name, type: field.type }),
  });
  const data = await res.json();
  if (!res.ok) {
    // If field already exists, that's fine
    if (data.error?.type === 'INVALID_REQUEST_UNKNOWN' || res.status === 422) {
      console.log(`  ⚠️  Already exists (skip): ${field.name}`);
      return;
    }
    throw new Error(`Failed to create "${field.name}": ${JSON.stringify(data)}`);
  }
  console.log(`  ✅ Created field: ${field.name}`);
  await sleep(500);
}

async function main() {
  if (!TOKEN) { console.error('❌ AIRTABLE_API_TOKEN not set'); process.exit(1); }
  console.log('⚔  Creating new Airtable fields...');
  for (const field of NEW_FIELDS) {
    await createField(field);
  }
  console.log('\n✅ All fields created. Now re-run the upsert:');
  console.log('   node scripts/airtable-upsert.mjs');
}

main();
