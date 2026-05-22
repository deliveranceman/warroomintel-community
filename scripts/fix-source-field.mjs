// scripts/fix-source-field.mjs
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE_ID = 'appVXEj2DLPBTJTtD';
const TABLE_ID = 'tblcP4lgVykzOhLi4';

async function getFieldId() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const data = await res.json();
  const table = data.tables?.find(t => t.id === TABLE_ID);
  const field = table?.fields?.find(f => f.name === 'Source / Orgin');
  if (!field) throw new Error('Field not found');
  console.log(`Found field: ${field.name} | type: ${field.type} | id: ${field.id}`);
  return field.id;
}

async function convertToText(fieldId) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields/${fieldId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'singleLineText' }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Failed to convert field:', JSON.stringify(data, null, 2));
    return false;
  }
  console.log('✅ Source / Orgin converted to singleLineText');
  return true;
}

async function main() {
  if (!TOKEN) { console.error('❌ AIRTABLE_API_TOKEN not set'); process.exit(1); }
  console.log('🔧 Converting Source / Orgin to plain text...');
  const fieldId = await getFieldId();
  const ok = await convertToText(fieldId);
  if (ok) {
    console.log('\nNow re-running upsert to fill the 30 affected records...');
    console.log('Run: node scripts/airtable-upsert.mjs');
  }
}

main();
