# Bundle 2b — Prep & Morning Review

## What landed overnight
- `netlify/functions/_shared/regionVocabulary.ts` — starter synonym crosswalk
- `netlify/functions/_shared/applySpiritRegions.ts` — Layer 2 region fan-out helper

Neither is imported yet. Live behavior unchanged.

## What to review in the morning

### 1. regionVocabulary.ts mappings
Walk every `// TODO` comment — these are mappings where ministry terminology choices need Justin's call:

- **"third eye" → `forehead`** — occult/New Age origin term (brow chakra / pineal gland). Some deliverance practitioners use it as shorthand for enemy access through the forehead/mind gate. Confirm whether this mapping is appropriate in WRI context, or remove it entirely.
- **"throat chakra" → `throat`** — chakra-system terminology from Eastern/New Age frameworks. Retained because it appears in some deliverance ministry literature as a shorthand for throat-area affliction. Confirm or remove.
- **"crown" → `cranium`** — mapped anatomically. In some ministry contexts "crown" carries authority/kingship connotations beyond the body region. Confirm anatomical mapping is sufficient, or note that it needs no separate region_key.

Also review the broader synonym set for completeness. If Layer 2 produces phrasing not yet covered, add entries to `REGION_SYNONYMS` before wiring.

### 2. applySpiritRegions.ts signature
Sanity-check the `RegionPayload` shape against what Layer 2 actually produces in `candidate_layer2_extractions` or whichever table holds Layer 2 output:

```ts
type RegionPayload = {
  region:      string   // free-text region name
  symptom?:    string   // manifestation description
  excerpt?:    string   // source quote (50-300 chars)
  confidence?: number   // 1-5 confidence score
}
```

Confirm field names match the Layer 2 JSON structure before wiring the callers.

### 3. Ambiguity threshold
Current threshold in `applySpiritRegions.ts` is **4 region_keys**. Terms resolving to more than 4 are pushed to `skipped_ambiguous` rather than inserted. Verify:
- "head" → `['brain', 'cranium', 'forehead']` = 3 keys → inserts ✓
- "chest" → `['heart', 'sternum_ribcage', 'left_lung', 'right_lung']` = 4 keys → inserts ✓
- "left arm" → `['left_shoulder', 'left_deltoid', 'left_bicep', 'left_forearm']` = 4 keys → inserts ✓
- "spine" → `['cervical_spine', 'thoracic_spine', 'lumbar_spine']` = 3 keys → inserts ✓

If any legitimate compound regions produce > 4 keys that should all insert, raise the threshold constant `AMBIGUITY_THRESHOLD` in `applySpiritRegions.ts`.

---

## What's still ahead (tomorrow's prompt)

- **Wire `applySpiritRegions` into `spirit-candidate-confirm.ts`** — on candidate approve, read body-region fields from the Layer 2 payload and fan out into `spirit_regions`
- **Wire `applySpiritRegions` into `library-enrich-apply.ts`** — on enrichment apply, same fan-out
- **Repoint `body-map.ts` reads** from `spirit_region_correlations` to `spirit_regions` (lines 112, 172, 222 per session handoff)
- **Add `source_suggestion_id uuid FK` column to `spirit_regions`** (migration) — replaces the `[from LES: id]` notes-based audit handle added as a temporary measure tonight

---

## State of region tables verified tonight
- `anatomy_regions`: 80 rows — canonical vocabulary (fixed; do not invent keys)
- `spirit_regions`: 2 rows (Witchcraft + Jezebel → `left_eye`)
- `spirit_region_correlations`: 2 rows (same data, legacy schema with `spirit_name` text)
- The "2-row migration" from a prior session handoff is **NO LONGER NEEDED** — canonical already has the data

---

## Follow-ups from tonight's debug session (out of Bundle 2b scope)

These were identified during the Pattern 7 / snapshot-fix debug session and are tracked here for the next planning session:

| Issue | Notes |
|---|---|
| `updated_at` not bumping on spirits writes | merge + enrichment paths need an explicit `updated_at: new Date().toISOString()` in their `UPDATE` payloads |
| Hysteria RAG retrieval bug | 25 chunks available, search returns 0 — likely embedding mismatch or index gap |
| `mapSpiritRow` `.id` vs `.uuid` naming inconsistency | `.id` is a 1-based UI row counter; `.uuid` holds the Supabase UUID — long-term rename to make `.id` the UUID |
| `duplicate_resolutions` schema debt | no `keep_id` / `delete_id` UUID columns; currently stores only spirit names |
| Slug regen on merge name-change | if merge picks a new canonical name, the slug doesn't update |
| `spirit_companions` + `spirit_hierarchy` migration debt | 679 + 32 dangling text-name references not yet linked to spirit UUIDs |
| Pattern 7 `ADMIN_PLAYBOOK.md` entry needed | document the `.id` / `.uuid` / `.airtableId` shape on demon objects so the next dev doesn't repeat the regression |
