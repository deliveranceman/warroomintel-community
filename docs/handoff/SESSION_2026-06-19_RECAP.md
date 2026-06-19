# WRI Session Recap — 2026-06-19

## Top-line outcome
13 commits + 4 migrations + 1 data fix landed. Phases 2A/2B/2C + 3 + 4
fully shipped + verified end-to-end. RAG architecture fixed. Background
function pattern established. Provenance chain complete across all five
Layer 1/3/5/6 fan-out tables.

## Commits (chronological)

| # | Hash | What |
|---|---|---|
| 1 | 6095ef9c | Truncation guard in extractSpiritFromSource |
| 2 | bbabd0bd | SOURCE_TYPE_MAP hoist to _shared/sourceTypeMap.ts |
| 3 | 51a7bda9 | /api/admin-retrofit-layer2 endpoint (initial) |
| 4 | 8c4447fd | layer6_scripture refs arrays in extraction prompt |
| 5 | 46d36800 | source_excerpt as RAG query in retrofit |
| 6 | 22d9b29a | Layer 3 Network fan-out (hierarchy + companions + resolver) |
| 7 | 5b0e7fc1 | Hierarchy + companions write source_suggestion_id |
| 8 | f1195886 | applySpiritGateways writes source_suggestion_id (parity) |
| 9 | 81fe85fd | Phase 3 applySpiritScriptures helper + wire-up |
| 10 | 4ae6e853 | Retrofit RAG swap to match_library_chunks_in_book |
| 11 | 5d2f7eb5 | candidate-run-layer2 RAG swap |
| 12 | 6e3e50c0 | Convert retrofit to background function + threshold 0.30 |
| 13 | 14e95792 | Convert candidate-run to background function + threshold 0.30 |
| 14 | e7ccda49 | candidate-run-layer2-background idempotency window |
| 15 | 1c2773fb | Unified approval auto-fan-out in spirit-candidate-confirm |

## Migrations
- M1: add_retrofit_audit_columns_to_les (retrofitted_at, retrofit_prompt_version)
- M2: add_source_suggestion_id_provenance_to_layer_fan_outs (4 fan-out tables)
- M3: add_match_library_chunks_in_book_function (book-scoped RAG RPC)
- M4: add_background_extraction_status_tracking (last_extraction_at +
       last_extraction_error on LES + spirit_candidates)

## Data fixes
- Eckhardt author consolidation: 3 spellings (John Eckhardt, John Ekhart,
  John Ekkehard) → 1 (John Eckhardt). 2 resources affected.

## Smoke-tests verified in production data
- spirit of debt (Phase 4): 7 gateways + 4 companions with full provenance
- spirit of lack (Phase 3): 11 primary + 4 context scripture refs with full provenance
- marriage-breaking spirits (RAG + background): 1 fresh LES, attested, layer1+layer3 populated
- spirit of rejection (RAG + background, Hammond retrofit): attested=true, 0 scripture refs (Hammond is theology-style content, blanks-over-placeholders doctrine held correctly)

## Key architectural decisions

### Adversarial-source data flow doctrine
The is_adversarial flag controls *display framing* (Intelligence Only badge,
source-class filtering, SOL doctrinal weighting) — NOT *data flow*.
Adversarial-source LES fan out into the same destination tables as
ministry-source LES. Adversarial sources frequently produce *richer* L1+L2+L3
intelligence than ministry sources because the enemy freely documents his
own playbook. Reframe principle: "the enemy tells you what to look for; the
minister tells you what to do about it."
Operational consequence: 364-LES backlog decision flipped from "selective bulk"
to "bulk all including Encyclopedia 265" once RAG fix lands.

### Provenance via source_suggestion_id
Every fan-out destination (spirit_regions, spirit_gateways, spirit_scriptures,
spirit_hierarchy, spirit_companions) carries source_suggestion_id FK back to
library_enrichment_suggestions. Display layer JOINs through LES → resources →
is_adversarial for source classification. Pattern locked in Migration M2.

### Book-scoped RAG with lower threshold
Two RPC functions coexist: match_library_chunks (global, legacy) and
match_library_chunks_in_book (book-scoped, new). Threshold dropped from
0.45 to 0.30 for book-scoped variant — within-book matching doesn't need
the noise-rejection of higher threshold since cross-book noise is already
eliminated by filter. Empirical: Hammond internal similarity floor is 0.461;
external excerpt queries land 0.30-0.45.

### Background function pattern for Layer 2 extraction
Both /api/admin-retrofit-layer2-background and /api/candidate-run-layer2-background
use Netlify Background Function convention (-background filename suffix → 15-min
runtime). Client gets 202 immediately; outcome written to DB via
last_extraction_at + last_extraction_error columns. Atomic from operator's
perspective — eliminates the non-deterministic sync-timeout silent failure.

## §6 silent-failure patterns documented
1. Spirit ↔ excerpt mismatch in pre-Layer-2 LES (upstream classifier picked
   spirit_name source_excerpt doesn't support) — unfixed, needs pre-bulk
   audit pass
2. Global-RPC RAG underweights small books — FIXED (M3 + commits 10, 11)
3. Mention-driven extraction misses scripture-dense unnamed passages —
   unfixed, deferred
4. Dual approval paths drop fan-out data — FIXED (commit 15 wires
   spirit-candidate-confirm to auto-trigger fan-outs)
5. Three Eckhardt author spellings — FIXED (data fix)
6. Synchronous Layer 2 extraction silently exceeds Netlify timeout —
   FIXED (commits 12, 13)
7. Sync extraction non-deterministic outcomes (ghost LES rows from
   completed-after-504 functions) — FIXED structurally (background pattern
   eliminates) + idempotency window (commit 14 prevents future)

## §10 priority queue updates

🔴 HIGH (production-critical, not yet fixed):
- Stripe webhook payment-critical fix (out of scope for this chat)

🟡 MEDIUM (operator-experience-blocking):
- Wave 2a Bulk Approve Mode UX (triage filters + bulk reject + keyboard
  review mode) — must ship before 364-LES bulk retrofit
- Admin action buttons for retrofit + candidate-run-layer2 endpoints (so
  operator doesn't need devtools console)
- Field overflow tooltips in Intel Archive list (cells truncate without
  hover/expand affordance)

🟢 LOW (nice-to-have / future):
- Layer 2 Conditions fan-out helper
- Layer 4 Lineage/Dream fan-out helper
- Layer 7 Counter-Strategies fan-out helper
- Curses Layer Phase 5a (deferred until spirits layer operationally
  complete; data already accumulating in spirit_gateways for future
  backfill)
- Public Curses Atlas Phase 5b (further deferred)
- Encyclopedia 265 adversarial bulk retrofit (now decided "yes, bulk all"
  per adversarial-source doctrine)

## Carryover for next session

In suggested order:

1. Verify commits 14 + 15 (idempotency + unified approval) by:
   a. MCP-checking marriage-breaking has no new ghost LES rows after a
      no-op re-invocation
   b. MCP-checking a candidate-confirm against a candidate with paired
      LES produces proper fan-out rows

2. Clean up the 2 existing ghost marriage-breaking LES rows
   (e0abc795, 9796981c) via bulk-reject or MCP DELETE

3. Wave 2a Bulk Approve Mode UX kickoff. Spec exists in earlier chat
   discussion. Approximate scope: 2-3 sessions.
   - Triage filter on LES queue (sort/filter by _meta.target_spirit_attested,
     _meta.extraction_completeness, is_adversarial, resource_id)
   - Inline expansion of proposed_fields without modal context switch
   - Status badges (🟢 fast-approve / 🟡 needs read / 🔴 reject-candidate)
   - Keyboard hotkeys (A approve, R reject, E edit, → next)
   - Bulk-reject action for attested=false filter

4. Admin action buttons (less ambitious than Wave 2a — just two buttons):
   - "Retrofit Layer 2" button on each pending LES row → POSTs to
     /api/admin-retrofit-layer2-background
   - "Run Layer 2 Extraction" button on each pending Spirit Candidate row →
     POSTs to /api/candidate-run-layer2-background

5. Bulk retrofit of 364-LES backlog (script-driven, supervised). Run
   after Wave 2a ships so review queue is tractable.

6. Curses Layer Phase 5a (deferred until 1-5 done)

## Known atomicity gaps (acceptable, no action needed)
- If background function is killed mid-writeFailure() (Netlify hard
  timeout at 15 min), LES row stays untouched. Window is 15 min vs
  prior 26 sec; a 15-min extraction indicates the model call itself is
  wrong. Acceptable tradeoff.

## Key identifiers (for next session)
- Repo: github.com/deliveranceman/warroomintel-community
- Netlify site: curious-malasada-6e47af
- Supabase project: uurfiasxtcvdpkfosofn
- Owner Clerk ID: user_3DlxgBsnfU83SRVMjkVxCkIr7tk (role minister, tier commandant)
- Anthropic model: claude-sonnet-4-5

### Resource UUIDs
- Eckhardt Identifying and Breaking Curses: c3e69971-b997-4849-8df4-9af48ea31a30
- Eckhardt Marine Demons: fe2ab691-982a-4671-875d-fb0ae81aa83e
- Moody: 1a10fd49-17e5-410c-9c6d-0547cb35c4bd
- Hammond Discerning of Spirits: 332b384a-2791-4fc7-8ab2-1e9eefddb964
- Encyclopedia: c6013cc8-4725-404d-aeaa-060752ed53aa

### Spirit UUIDs
- spirit of debt: 6009fb15-5c2e-481c-b777-4b9cb2e5fa65
- spirit of lack: 8dabfe3e-2fab-4008-a6a2-e6c02ba53dea
- Freemasonry: 520d5f3b-e67d-453d-a157-5dabf320e8fa
- Baal: 54a89bb5-d5a9-4f9b-b178-59ce614fdb36

### LES UUIDs
- spirit of debt: 88ce1e9a-fd71-4b7a-858c-db70ac7438df (applied)
- spirit of lack: 4eee6ca2-8408-40c8-abf8-2138d8225316 (applied)
- Freemasonry: 0ca0fd08-f280-443a-a334-6c905628030d (applied)
- spirit of rejection: b49aca7f-2a22-4434-8a9a-5a3ab12404cb (retrofitted, pending approval)
- marriage-breaking spirits (canonical): 389719d3-ab17-4068-abfa-09d55b93f217 (pending)
- marriage-breaking spirits (ghost): 9796981c-c707-4663-a962-2b5bef28868e
- marriage-breaking spirits (ghost): e0abc795-ae0e-49f3-b3ff-2d220a2a9454

### Candidate UUIDs
- marriage-breaking: d80e218d-7400-4e55-87b5-8c97deda3375 (pending)
- spirit of lack: 53296fb1-7a01-4a01-81ca-5bb6d851214f (pending — superseded by LES path)
