// scripts/airtable-upsert.mjs
// Usage: node scripts/airtable-upsert.mjs
import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE_ID = 'appVXEj2DLPBTJTtD';
const TABLE_ID = 'tblcP4lgVykzOhLi4';
const SPIRIT_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE';

const XLSX_PATH = path.resolve(__dirname, '../Master_Demon_Database_Deep_Expanded.xlsx');

const FIELDS = [
  '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE',
  'Also Known As','Type / Rank','Description','Manifestiation',
  'Scripture Reference','Entry Points',
  'Legal Rights','Symptoms','Companion Spirits',
  'WRI Exorcist Notes','Assignment',
  'Hierarchy Category','Parent Strongman','Deliverance Sequence',
  'Operational Notes','Primary Battlefield',
  'Typical Personality Presentation','Counter Scriptures',
];

async function api(method, endpoint, body) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Airtable ${method} failed: ${res.status} — ${await res.text()}`);
  return res.json();
}

async function fetchExisting() {
  console.log('📥 Fetching existing records...');
  const map = {};
  let offset;
  do {
    const qs = '?fields[]=' + encodeURIComponent(SPIRIT_FIELD) + (offset ? `&offset=${offset}` : '');
    const data = await api('GET', qs);
    for (const r of data.records) {
      const n = r.fields[SPIRIT_FIELD];
      if (n) map[n.toLowerCase().trim()] = r.id;
    }
    offset = data.offset;
  } while (offset);
  console.log(`✅ ${Object.keys(map).length} existing records`);
  return map;
}

function buildFields(row) {
  const f = {};
  for (const field of FIELDS) {
    const v = row[field];
    const s = v !== null && v !== undefined ? String(v).trim() : '';
    if (s && s !== 'nan') f[field] = s;
  }
  return f;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!AIRTABLE_TOKEN) { console.error('❌ AIRTABLE_API_TOKEN not set'); process.exit(1); }
  if (!fs.existsSync(XLSX_PATH)) { console.error('❌ xlsx not found at:', XLSX_PATH); process.exit(1); }

  console.log('⚔  War Room Intel — Demon Database Mass Upsert');
  console.log('================================================');

  const wb = XLSX.readFile(XLSX_PATH);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  console.log(`📖 ${rows.length} rows from xlsx`);

  const existing = await fetchExisting();
  const stats = { updated: 0, created: 0, errors: 0 };

  const BATCH = 10;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const toUpdate = [], toCreate = [];

    for (const row of batch) {
      const name = String(row[SPIRIT_FIELD] || '').trim();
      if (!name) continue;
      const fields = buildFields(row);
      const id = existing[name.toLowerCase()];
      if (id) toUpdate.push({ id, fields });
      else toCreate.push({ fields });
    }

    try {
      if (toUpdate.length) {
        await api('PATCH', '', { records: toUpdate });
        toUpdate.forEach(r => console.log(`  ✏️  Updated: ${r.fields[SPIRIT_FIELD]}`));
        stats.updated += toUpdate.length;
        await sleep(250);
      }
      if (toCreate.length) {
        await api('POST', '', { records: toCreate });
        toCreate.forEach(r => console.log(`  ➕ Created: ${r.fields[SPIRIT_FIELD]}`));
        stats.created += toCreate.length;
        await sleep(250);
      }
    } catch (e) {
      console.error(`  ❌ Batch error: ${e.message}`);
      stats.errors += batch.length;
    }

    const done = Math.min(i + BATCH, rows.length);
    console.log(`[${done}/${rows.length}]`);
    await sleep(300);
  }

  console.log('\n================================================');
  console.log(`⚔  DONE — Updated: ${stats.updated} | Created: ${stats.created} | Errors: ${stats.errors}`);
}

main();
