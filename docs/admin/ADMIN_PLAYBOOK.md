# War Room Intel Community — Admin Playbook

Generated from a full read of every source file listed below. Every claim cites a real file and line number. Broken/incomplete items are marked **[⚠ BROKEN]** or **[⚠ STUB]** or **[⚠ SECURITY]** or **[⚠ TRANSITIONAL]**.

Source files read:
- `src/routes/admin.tsx` (14,762 lines — read in full)
- All `src/routes/api.*.ts` files (20 files)
- All `netlify/functions/admin-*.ts` files (25 files)
- All `netlify/functions/spirit-*.ts` files (13 files)
- All `netlify/functions/library-*.ts` files (13 files)
- All `netlify/functions/_shared/*.ts` files

---

## Section 1: Page Inventory

### 1.1 Admin Shell

**Route:** `/admin`  
**Component:** `AdminPage` (admin.tsx:12198–12503)  
**Auth gate:** Frontend checks `role !== 'minister'` from Clerk `publicMetadata` (admin.tsx:12251). The `role` field must be the string `"minister"` — this is separate from the `tier` field. Note: the backend gate everywhere uses `requireAdmin2` which checks `level >= 4`, meaning minister(4) or commandant(5).

The shell renders a two-panel layout: a collapsible sidebar with grouped nav links, and a tab content area. Tabs are shown in the sidebar grouped by category (see SIDEBAR_GROUPS at admin.tsx:12268). The current tab is held in `useState<Tab>`.

**Tab type** (admin.tsx:12201) includes these 32+ values:
`dashboard | arsenal | intel | moderation | training | daily-brief | field-ministry | documents | library | spiritual-mapping | lib-intel | ai-command | taxonomy | tracker | internal-books | admin-chat | enrichment | suggested-edits | ai-context | notifications | ai-usage-admin | content-suggestions | members | test-sol | sol-research | atmosphere | spirit-candidates | sources | modals | help-docs | enrichment-suggestions | suggested-edits`

**Sidebar groups** (admin.tsx:12268):

| Group | Tabs |
|-------|------|
| DASHBOARD | Dashboard |
| SOL | Content Studio, AI Command, AI Usage, AI Context, Content Intelligence, Test SOL, Research Drop |
| INTEL ARCHIVE | Intel Archive, Spirit Candidates, Sources, Taxonomy Review, Spiritual Mapping |
| MODERATION | Moderation |
| CONTENT | Ministry Library, Arsenal, Documents, Training, Daily Brief, Field Ministry |
| OPERATIONS | Members, Notifications, Modals, Help & Docs, Admin Chat, Tracker, Atmosphere |

---

### 1.2 Dashboard

**Tab:** `dashboard`  
**Component:** `DashboardView` (admin.tsx:7619–7977)  
**APIs called:**
- `GET /api/admin-quick-stats` — ai_usage today + testimonies count + Clerk users
- `GET /api/enrichment-history` — ai_jobs spirit_enrich jobs
- `GET /api/admin-tracker` — admin_tracker rows

Shows quick stats, recent enrichment activity summary, and tracker status overview.

---

### 1.3 Intel Archive (Spirit Database)

**Tab:** `intel`  
**Component:** `IntelArchive` (admin.tsx:2349–4420)  
**Sub-tabs:** database | enrichment | taxonomy | gap-analysis | duplicates | body-map | history

**database sub-tab:**
- Lists all spirits from Airtable via `GET /api/admin-demon` (still reads Airtable — [⚠ TRANSITIONAL])
- SpiritTypeahead search (admin.tsx:1061–1149)
- SpiritEditForm (admin.tsx:1151–1609): full field editor, calls `PATCH /api/admin-demon` (writes Supabase)
- Inline "Enrich with AI" button triggers `POST /api/admin-demon` enrich job flow

**enrichment sub-tab:**
- Calls `GET /api/enrichment-history?spiritId=...`
- Shows ai_jobs grouped by batch (60-second window), field-by-field apply with checkboxes
- Per-field apply calls `POST /api/spirit-enrich-apply` with `applyFields`
- "Restore" per snapshot calls `POST /api/spirit-restore-snapshot`

**taxonomy sub-tab:**
- Feeds into TaxonomyReview component (see §1.21)

**gap-analysis sub-tab:**
- Calls `POST /api/library-intelligence` with `tool: 'gap-analysis'`
- Reads `library_spirit_cache` vs Airtable to find spirits in books not yet in database

**duplicates sub-tab:**
- Internal duplicate detection logic (no separate API)

**body-map sub-tab:**
- Renders `BodyMapAdmin` (admin.tsx:1802–2308), self-labeled as "LEGACY" in code

**history sub-tab:**
- Same enrichment history view as `EnrichmentHistory` component

---

### 1.4 Spirit Candidates

**Tab:** `spirit-candidates`  
**Component:** `SpiritCandidatesManager` (admin.tsx:11884–12196)  
**APIs:**
- `GET /api/spirit-candidates` — list spirit_candidates
- `POST /api/spirit-candidates` with `action: 'update_status'` — status updates
- `POST /api/spirit-candidate-approve` — returns field-mapping preview
- `POST /api/spirit-candidate-confirm` — writes spirit to Supabase (USE_SUPABASE_DEMON_WRITES=true)
- `POST /api/spirit-candidate-enrich` — AI enriches the candidate before confirm

Multi-step: list → review → AI enrich (optional) → preview → confirm.

Note: The preview modal is labeled "AIRTABLE RECORD PREVIEW" in the UI but actually writes to Supabase. The `airtable_record_id` column in `spirit_candidates` now stores the Supabase slug after confirm.

---

### 1.5 Sources (Master Source List)

**Tab:** `sources`  
**Component:** `SourcesMasterList` (admin.tsx:11551–11882)  
**Table:** `ministry_sources`  
**API:** `GET/POST/PATCH/DELETE /api/admin-sources`

Full CRUD for ministry sources. The "Generate AI Brief" action on each source calls the same endpoint with `action: 'generate_brief'` which uses Claude to produce a summary of the source.

---

### 1.6 Taxonomy Review

**Tab:** `taxonomy`  
**Component:** `TaxonomyReview` (admin.tsx:13108–13631)  
**APIs:**
- `GET /api/taxonomy-spirits` — reads Airtable, returns slug as `recordId` when flag is on [⚠ TRANSITIONAL]
- `POST /api/admin-taxonomy-ai` — reads Airtable for context, AI classifies kingdom/rank [⚠ TRANSITIONAL]
- `PATCH /api/admin-taxonomy-patch` — writes kingdom/sub_kingdom/biblical_rank to Supabase with snapshot

Taxonomy writes land in Supabase; reads still come from Airtable.

---

### 1.7 Spiritual Mapping

**Tab:** `spiritual-mapping`  
**Component:** `SpiritualMappingAdmin` (admin.tsx:9193–9302)  
**APIs:**
- `GET /api/sm-regions` — list all approved sm_regions
- `GET /api/sm-submission?pending=true` — list pending sm_submissions
- `PATCH /api/sm-submission` — approve/reject a submission (requireAdmin2)

Admin approves submitted regional spiritual mapping assessments. The GET on sm-submission is unauthenticated — anyone can list submissions by userId or all pending ones.

[⚠ SECURITY NOTE] `GET /api/sm-submission` has no auth gate when called without PATCH. The POST (submission creation) also has no auth gate at all — any unauthenticated user can create a submission record.

---

### 1.8 Ministry Library

**Tab:** `library`  
**Component:** `LibraryManager` (admin.tsx:5999–7574)  
**APIs:**
- `GET /api/admin-library` — reads from `resources` WHERE topic='ministry-library'
- `POST /api/admin-library` — [⚠ BROKEN] writes to `ministry_library` table (different table from GET)
- `POST /api/library-index` — extracts text from uploaded file, stores in `resources.extracted_text`
- `POST /api/library-autofill` — AI-fills title/author/spirit_tags from filename + content
- `POST /api/library-backfill` — batch re-index all books in 'ministry-library' bucket
- `POST /api/library-embed-backfill` — background function: embed all books without library_chunks
- `POST /api/library-reanalyze` — re-runs Claude analysis on a single book (requires `requireTier(req, 2)`)
- `POST /api/library-approve` — approve/reject a resource (sets `status`, `active`, `approved_at`)
- `POST /api/library-summarize` — patristic scan for spirit mentions via `_shared/patristicScan`
- `GET /api/library-summary` — quick stat list of books in library

Upload flow in LibraryManager: 3-step wizard — upload file → autofill metadata → save. The save step posts to `/api/admin-library` which [⚠ BROKEN] writes to `ministry_library` instead of `resources`. Books uploaded this way will NOT appear in the GET list which reads from `resources`.

---

### 1.9 Library Intelligence (Content Intelligence)

**Tab:** `lib-intel`  
**Component:** `LibraryIntelligence` (admin.tsx:8527–9191)  
**Also rendered in:** `ai-command` tab stacked above `AICommandManager`  
**APIs:**
- `POST /api/library-intelligence?tool=gap-analysis` — spirit gap analysis
- `POST /api/library-intelligence?tool=content-query` — semantic search against library_chunks (OpenAI embeddings + pgvector)
- `POST /api/library-enrich` [⚠ SECURITY] — generates enrichment suggestions from a book (requireAuth, not requireAdmin2)

The `library-enrich` function is accessible to any authenticated user, not just admins.

---

### 1.10 Enrichment Suggestions

**Tab:** `enrichment-suggestions`  
**Component:** `EnrichmentSuggestions` (admin.tsx:14292–14624)  
**APIs:**
- `POST /api/library-enrich-apply` with `action: 'list'` — list pending suggestions [⚠ SECURITY: requireAuth]
- `POST /api/library-enrich-apply` with `action: 'approve'` — apply suggestion to spirit in Supabase
- `POST /api/library-enrich-apply` with `action: 'reject'` — reject + log to enrichment_rejected
- `POST /api/library-enrich-apply` with `action: 'patch_fields'` — edit proposed fields
- `POST /api/library-enrich-apply` with `action: 'ai_fill_field'` — AI rewrites single field

All actions on library-enrich-apply use `requireAuth` not `requireAdmin2`. Any authenticated user can list, approve, or reject enrichment suggestions, and approve writes directly to the spirits table.

---

### 1.11 Enrichment History

**Tab:** `enrichment`  
**Component:** `EnrichmentHistory` (admin.tsx:13837–14290)  
**API:** `GET /api/enrichment-history?spiritId=...`

Shows ai_jobs WHERE job_type='spirit_enrich'. Grouped by batch (60-second windows). Each job shows field-by-field proposed values with apply checkboxes. The apply action calls `POST /api/spirit-enrich-apply`. The restore action calls `POST /api/spirit-restore-snapshot`.

---

### 1.12 Suggested Edits

**Tab:** `suggested-edits`  
**Component:** `SuggestedEditsAdmin` (admin.tsx:14626–14761)  
**API:** `GET/PATCH /api/suggested-edits`

---

### 1.13 AI Command

**Tab:** `ai-command`  
**Component:** Renders both `LibraryIntelligence` AND `AICommandManager` stacked (admin.tsx:12469)  
**AICommandManager** (admin.tsx:5750–5997):
- **Ministry Context CRUD** via `GET/POST/PATCH/DELETE /api/admin-context`
- Table: `ministry_context`
- The active ministry context record is used as preamble in all spirit enrichment prompts

---

### 1.14 AI Context

**Tab:** `ai-context`  
**Component:** `MinistryContextManager` (admin.tsx:9525–9801)  
**Same API as AI Command:** `/api/admin-context`

Two tabs render the same ministry context management functionality (ai-command and ai-context). They are the same underlying data.

---

### 1.15 Content Studio

**Tab:** `content-suggestions`  
**Component:** `ContentStudio` (admin.tsx:10882–11230)  
**API:** `POST /api/admin-content-ai`  
**Content types:** `daily_brief | field_manual | weekly_intel | fringe_article`

Generates structured JSON output for each type. Uses claude-sonnet-4-5.

---

### 1.16 AI Usage

**Tab:** `ai-usage-admin`  
**Component:** `AIUsageAdmin` (admin.tsx:9803–9895)  
**API:** `GET /api/admin-ai-stats`  
**Table:** `ai_usage`

Today's usage stats only (per call_type).

---

### 1.17 Test SOL

**Tab:** `test-sol`  
**Component:** `TestSOLPanel` (admin.tsx:11232–11337)  
**API:** `POST /api/ai-assistant`

Direct test harness for the SOL AI assistant. Sends a message and returns the response. No streaming — waits for full response.

---

### 1.18 Research Drop (Sol Research)

**Tab:** `sol-research`  
**Component:** `SolResearchView` (admin.tsx:12505–12755)  
**API:** `POST /api/sol-research`

Three input modes: file upload, URL, and raw text. Passes content to SOL for research analysis.

---

### 1.19 Moderation

**Tab:** `moderation`  
**Component:** `ModerationPanel` (admin.tsx:5303–5499), `FlagsPanel` (admin.tsx:5568–5636), `ForumModerationPanel` (admin.tsx:5638–5748)  
**API:** `GET /api/admin-moderation`

[⚠ STUB] The moderation endpoint returns a stub message: "Connect Stream server-side SDK" (`admin-moderation.ts`). The Stream channel list, message list, and moderation actions are not implemented. FlagsPanel and ForumModerationPanel are frontend-only stubs with no working backend.

---

### 1.20 Arsenal

**Tab:** `arsenal`  
**Component:** `ArsenalManager` (admin.tsx:105–985)  
**APIs:**
- `GET/POST/PATCH/DELETE /api/admin-resources` — CRUD for `resources` WHERE source_type='arsenal'
- `GET/POST/DELETE /api/admin-episodes` — CRUD for episodes linked to courses
- `POST /api/admin-episode-upload` — upload thumbnails/attachments to 'episode-files' bucket

Two concepts coexist in the resources table: Arsenal items (source_type='arsenal') and Ministry Library books (topic='ministry-library'). `admin-resources.ts` only touches source_type='arsenal'.

---

### 1.21 Training

**Tab:** `training`  
**Component:** `TrainingManager` (admin.tsx:4422–5302)  
**Sub-tabs:** courses | fringe | events  
**APIs:**
- `GET/POST/PATCH/DELETE /api/admin-courses` — courses + episodes

---

### 1.22 Daily Brief

**Tab:** `daily-brief`  
**Component:** `DailyBriefManager` (admin.tsx:9304–9523)  
**API:** `GET/POST/PATCH /api/admin-daily-brief` (implied from component)

---

### 1.23 Field Ministry

**Tab:** `field-ministry`  
**Component:** `FieldMinistryManager` (admin.tsx:7979–8283)  
**APIs implied from component structure**

---

### 1.24 Documents

**Tab:** `documents`  
**Component:** `DocumentsView` (admin.tsx:8285–8525)  
**API:** `POST /api/admin-generate-document`

Generates documents using claude-sonnet-4-5 with a 25-second timeout. Template-driven generation.

---

### 1.25 Members

**Tab:** `members`  
**Component:** Inline in `AdminPage` (admin.tsx:12492)

[⚠ STUB] Renders only the text "MEMBERS — COMING SOON". No functional UI.

---

### 1.26 Notifications

**Tab:** `notifications`  
**Component:** `NotificationsAdmin` (admin.tsx:9897–10428)  
**APIs:**
- `POST /api/admin-notifications` — dispatch composer + test push + email test

The component has three sections: broadcast notification composer, test push notification, and email test.

---

### 1.27 Modals

**Tab:** `modals`  
**Component:** `ModalsAdmin` (admin.tsx:10632–10880)  
**API:** `GET/POST/PATCH/DELETE /api/admin-modals`  
**Table:** `modals` (ordered by priority DESC)

Types: `announcement | terms`  
Frontend frequency options: `once_ever | once_per_day | every_login`  
[⚠ BROKEN] Backend default for frequency field is `'once'` (`admin-modals.ts` line ~50), not one of the three values shown in the frontend. This mismatch may cause modals to never trigger or trigger on the wrong schedule.

---

### 1.28 Help & Docs

**Tab:** `help-docs`  
**Component:** `AdminDocs` (admin.tsx:10430–10630)  
**API:** `GET/POST/PATCH/DELETE /api/admin-docs`  
**Table:** `admin_docs`

Surfaces records of type `help` or `architecture`. Uses raw Supabase REST fetch() calls (not the Supabase JS client) — inconsistent with all other functions.

---

### 1.29 Admin Chat

**Tab:** `admin-chat`  
**Component:** `AdminChat` (admin.tsx:12929–13106)  
**API:** `POST /api/admin-chat`  
**contextMode:** `library | database | both`

Semantic search uses OpenAI embeddings → `match_library_chunks` RPC. Keyword fallback scans `resources.extracted_text` WHERE topic='ministry-library'. System prompt hardcodes context: "Pastor Justin Payne, Staffordtown Church (Church on Fire), Copperhill, Tennessee" (admin-chat.ts lines ~60–70).

---

### 1.30 Tracker

**Tab:** `tracker`  
**Component:** `TrackerView` (admin.tsx:13633–13835)  
**APIs:**
- `GET/PATCH /api/admin-tracker` — admin_tracker full CRUD
- `POST /api/admin-tracker-seed` — seeds 24 pages + 25 features + 27 API endpoints (idempotent)

---

### 1.31 Atmosphere

**Tab:** `atmosphere`  
**Component:** `AtmosphereAdmin` (admin.tsx:11339–11549)  
**APIs:**
- `GET/POST/PATCH/DELETE /api/atmosphere`
- `POST /api/test-atmosphere-push`

---

### 1.32 Internal Books

**Tab:** `internal-books`  
**Component:** `InternalBooks` (admin.tsx:12757–12927)  
**API:** `POST /api/library-search`

Book reader and semantic search against `library_chunks` via `match_library_chunks` RPC. Uses OpenAI embeddings (requires OPENAI_API_KEY).

---

## Section 2: Data Lifecycle Maps

### 2.1 Spirit / Demon Entry Lifecycle

```
[New Spirit Sources]
  ├── Spirit Candidates (spirit_candidates table)
  │     POST /api/spirit-candidates (action: 'add_candidate')
  │     → AI enrich: POST /api/spirit-candidate-enrich
  │     → Preview: POST /api/spirit-candidate-approve
  │     → Confirm: POST /api/spirit-candidate-confirm
  │           → createSpirit() in spiritWrite.ts
  │           → INSERT into spirits (Supabase)
  │
  ├── Bulk Import
  │     POST /api/spirit-bulk-import
  │     → upsertSpiritByName() per row
  │     → INSERT/UPDATE spirits (Supabase)
  │
  ├── Manual Admin Add
  │     POST /api/admin-demon (creates new spirit)
  │     → createSpirit() in spiritWrite.ts
  │     → INSERT into spirits (Supabase)
  │
  └── Library Enrichment Suggestions (approved)
        POST /api/library-enrich-apply (action: 'approve', suggestion.action='add')
        → createSpirit()
        → INSERT into spirits (Supabase)

[Spirit Updates]
  ├── Admin Edit Form
  │     PATCH /api/admin-demon
  │     → updateSpiritBySlug() with meta.source='manual'
  │     → insertFieldSnapshots() → spirit_apply_snapshots
  │     → UPDATE spirits (Supabase)
  │
  ├── AI Enrichment Apply
  │     POST /api/spirit-enrich-apply
  │     → updateSpiritBySlug() with meta.source='enrich'
  │     → insertFieldSnapshots() → spirit_apply_snapshots
  │     → UPDATE spirits (Supabase)
  │
  ├── Library Enrich Apply (existing spirit)
  │     POST /api/library-enrich-apply (action='approve', suggestion.action='enrich')
  │     → insertFieldSnapshots() with source='library_enrich'
  │     → UPDATE spirits (Supabase)
  │
  └── Taxonomy Patch
        PATCH /api/admin-taxonomy-patch
        → insertFieldSnapshots() with source='taxonomy'
        → UPDATE spirits.kingdom/sub_kingdom/biblical_rank (Supabase)

[Spirit Reads]
  GET /api/demons → spirits (Supabase, USE_SUPABASE_DEMONS=true)
  GET /api/admin-demon → Airtable  [⚠ TRANSITIONAL — still reads Airtable]
  GET /api/taxonomy-spirits → Airtable  [⚠ TRANSITIONAL]
  GET /api/admin-taxonomy-ai → Airtable  [⚠ TRANSITIONAL]
  GET /api/spirit-of-day → Airtable + spirit_of_day_cache (Supabase)
  GET /api/spirit-of-week → spirit_of_week (Supabase)

[Field Snapshot / Restore]
  spirit_apply_snapshots — written on every field change
  GET /api/spirit-apply-snapshots?spiritId=... → read snapshots
  POST /api/spirit-restore-snapshot → write prior_value back to spirits

[Spirit Merge]  [⚠ STALE AIRTABLE]
  POST /api/spirit-merge → Airtable ONLY (no Supabase path)
```

### 2.2 Ministry Library Lifecycle

```
[Book Upload]
  Admin uploads file via LibraryManager 3-step wizard
  Step 1: POST /api/admin-upload (storage bucket 'resources')
  Step 2: POST /api/library-autofill → AI title/author/spirit_tags
  Step 3: POST /api/admin-library   [⚠ BROKEN → writes to ministry_library table]

[Text Extraction]
  POST /api/library-index → downloads from 'ministry-library' bucket
                          → extracts text (txt/pdf/docx)
                          → UPDATE resources.extracted_text

[Book Approval]
  POST /api/library-approve (action: 'approve' or 'reject')
  → UPDATE resources.status, active, approved_at, approved_by

[Re-analysis]
  POST /api/library-reanalyze → AI re-analyzes with Claude Haiku
                              → UPDATE resources.title, description, spirit_tags, function_tags
                              → UPDATE library_spirit_cache

[Embedding / Chunking]
  POST /api/library-backfill → full re-index, creates library_chunks rows
  POST /api/library-embed-backfill → background function, embeds un-chunked books
  library_chunks rows → used by match_library_chunks RPC (pgvector)

[Library Summarize (Patristic Scan)]
  POST /api/library-summarize → patristicScan reads spirits from book
                              → stages candidates to spirit_candidates
                              → UPDATE resources.ai_summary, summary_status

[Library Enrichment Pipeline]
  POST /api/library-enrich [⚠ SECURITY: requireAuth]
  → scans book for spirit candidates
  → Claude validates and extracts proposed fields
  → INSERT library_enrichment_suggestions (status: 'pending')

  Admin reviews in EnrichmentSuggestions tab:
  POST /api/library-enrich-apply (action: 'list')    → pending suggestions
  POST /api/library-enrich-apply (action: 'approve') → write to spirits
  POST /api/library-enrich-apply (action: 'reject')  → mark rejected + enrichment_rejected

[Library Search]
  POST /api/library-search → OpenAI embedding → match_library_chunks RPC
  (accepts x-internal-key OR requireAuth — dual auth path)
```

### 2.3 AI Jobs (Spirit Enrichment) Lifecycle

```
[Create enrichment job]
  POST /api/admin-demon (action: 'enrich') → INSERT ai_jobs (status: 'pending')

[Process job]
  Background: fetches spirit data + ministry context + library chunks
  → Claude generates proposed fields
  → UPDATE ai_jobs (status: 'complete', result_json: { proposed, spiritSlug })

[Apply job]
  POST /api/spirit-enrich-apply → reads ai_jobs WHERE status='complete'
                                → updateSpiritBySlug() with snapshots
                                → stamps result_json.applied_at

[Enrich field-by-field]
  applyFields param on spirit-enrich-apply: applies subset of proposed fields
  Each apply call stamps result_json.applied_fields
  Idempotency: result_json.applied_at check prevents double-apply
```

### 2.4 User Tier Lifecycle

```
[New user]
  Clerk webhook (user.created) → api/clerk-webhook
  → PATCH Clerk public_metadata: { tier: 'Watchman' }
  → Add user to 'war-room-general' Stream channel

[Tier upgrade]
  Admin: PATCH /api/admin-fix-user-tier
  → PATCH Clerk public_metadata: { tier: newTier }
  → Add to Stream channels (war-room-general, field-reports-live, commanders-room if ≥2, generals-table if ≥3)
  [⚠ INCOMPLETE] Never REMOVES from Stream channels on downgrade

[Tier read]
  GET /api/user-tier → verifyToken + Clerk REST → returns { tier, authenticated }
  requireAuth/_shared/access.ts → Clerk REST lookup → auth.level (0–5)

[Member lookup]
  GET /api/mn-verify → Airtable members base (requireAdmin2)
  GET /api/get-members → Clerk users list (requireTier 1+)
```

### 2.5 Assessment Lifecycle

```
[Submit]
  POST /api/submit-assessment (requireAuth)
  → diagnoseFlaggedSpirits() — deterministic rule engine
  → POST to Airtable assessments table (BASE_ID: appLPhhHPP5rKvlKT)
  → Claude Haiku generates title + summary + draft response
  → PATCH Airtable record with AI fields

[Admin view]
  GET /api/assessment-board — published assessments (no auth)
  POST /api/generate-summary — re-generate AI summary (requireAdmin2)

[Spiritual Mapping Assessment]
  POST /api/sm-assessment → INSERT sm_assessments (requireTier 2 + allowBeta: 'spirit_mapper')
  PUT /api/sm-assessment  → UPDATE sm_assessments (requireTier 2 + allowBeta: 'spirit_mapper')
  GET /api/sm-assessment  → SELECT sm_assessments (requireTier 2 + allowBeta: 'spirit_mapper')
```

### 2.6 Stream Chat Lifecycle

```
[Channel membership]
  war-room-general: all users (added on signup via clerk-webhook)
  field-reports-live: added by admin-fix-user-tier when tier ≥ 1
  commanders-room: added when tier ≥ 2
  generals-table: added when tier ≥ 3

[DM channels]
  DELETE: POST /api/admin-reset-dm-channels [⚠ DIFFERENT AUTH: x-admin-secret]
  Deletes ALL messaging channels EXCEPT 'war-room-general' and 'prayer-wall-requests'

[Spirit of Week / Day]
  GET /api/spirit-of-week → spirit_of_week (Supabase, public)
  POST /api/spirit-of-week → deactivate old + INSERT new (requireAdmin2)
  GET /api/spirit-of-day → Airtable + spirit_of_day_cache (requireAuth)
```

---

## Section 3: Cross-Page Patterns

### 3.1 Authentication Pattern

Every handler follows the two-step Clerk pattern (defined in `netlify/functions/_shared/access.ts`):
1. `verifyToken()` — cryptographic signature check on the JWT
2. Clerk REST `GET /v1/users/{userId}` — reads `public_metadata.tier` for the real tier

The tier-to-level mapping:
- watchman/free = 0
- soldier = 1
- commander = 2
- general = 3
- minister = 4
- commandant = 5

**`requireAdmin2`** = level >= 4. Used by all admin endpoints except:
- `library-enrich.ts` and `library-enrich-apply.ts` (use `requireAuth`) [⚠ SECURITY]
- `spirit-equivalents.ts` (uses `requireAuth`) [⚠ SECURITY]
- `library-reanalyze.ts` (uses `requireTier(req, 2)` — commander+) 
- `admin-reset-dm-channels.ts` (uses `x-admin-secret` header + `ADMIN_SECRET` env var) [⚠ DIFFERENT AUTH]
- `spirit-of-day.ts` (uses `requireAuth`)
- `spirit-resources.ts` (uses `requireAuth`, open to anonymous with tier 0)
- `library-search.ts` (accepts `x-internal-key` OR `requireAuth`)
- `api/warroom-chat.ts` (uses `requireAuth`)
- `api/submit-assessment.ts` (uses `requireAuth`)
- `api/get-members.ts` (uses `requireTier(req, 1)`)
- `api/generate-field-card.ts` (uses `requireTier(req, 1)`)

**Frontend gate** (admin.tsx:12251):
```tsx
if (role !== 'minister') {
  return <AccessDenied />
}
```
This checks the `role` field in Clerk `publicMetadata`, not the `tier` field. They are separate fields. A user with tier='minister' but no explicit `role='minister'` set would fail this gate.

**File:** `netlify/functions/_shared/access.ts`

### 3.2 Supabase Migration Flag Pattern

Multiple files use the same flag to gate write destination:

```typescript
const USE_SUPABASE_DEMON_WRITES = true
```

Files with this flag:
- `netlify/functions/admin-demon.ts` — GET reads Airtable, PATCH/POST write Supabase
- `netlify/functions/admin-taxonomy-patch.ts` — writes Supabase
- `netlify/functions/admin-taxonomy-ai.ts` — reads Airtable, returns slug as recordId
- `netlify/functions/spirit-candidate-confirm.ts` — writes Supabase
- `netlify/functions/spirit-bulk-import.ts` — writes Supabase
- `netlify/functions/library-enrich-apply.ts` — writes Supabase
- `netlify/functions/library-summarize.ts` — flag present but commented as suppressed

Files NOT yet migrated:
- `netlify/functions/spirit-merge.ts` — [⚠ STALE AIRTABLE] Airtable only, no flag
- `netlify/functions/spirit-of-day.ts` — Airtable reads + spirit_of_day_cache in Supabase
- `netlify/functions/library-enrich.ts` — reads Airtable for demon name lookup
- `netlify/functions/library-intelligence.ts` — reads Airtable for gap analysis
- `netlify/functions/library-autofill.ts` — reads Airtable for demon name dedup
- `src/routes/api.resources.ts` — reads Airtable resources base (separate base from demon db)
- `src/routes/api.admin-upload.ts` — reads/writes Airtable resources base [⚠ TRANSITIONAL]

### 3.3 Table Usage Across Endpoints

| Supabase Table | Endpoints That Write | Endpoints That Read |
|---|---|---|
| `spirits` | admin-demon PATCH/POST, spirit-candidate-confirm, spirit-bulk-import, library-enrich-apply approve, spirit-restore-snapshot, admin-taxonomy-patch, spirit-merge (Airtable only [⚠]) | api/demons, spirit-enrich-apply, spirit-apply-snapshots, spirit-equivalents |
| `spirit_apply_snapshots` | insertFieldSnapshots (via spiritWrite.ts) | spirit-apply-snapshots, enrichment-history |
| `ai_jobs` | admin-demon enrich action | spirit-enrich-apply, enrichment-history |
| `spirit_candidates` | spirit-candidates POST, spirit-candidate-enrich, spirit-candidate-confirm | spirit-candidates GET, SpiritCandidatesManager |
| `library_enrichment_suggestions` | library-enrich INSERT, library-enrich-apply UPDATE | library-enrich-apply list |
| `resources` | admin-library GET/PATCH/DELETE [⚠], library-index, library-approve, library-reanalyze, library-backfill, library-autofill (metadata) | admin-library GET, library-summary, library-chunks, library-intelligence, admin-resources (source_type='arsenal') |
| `ministry_library` | admin-library POST [⚠ BROKEN — never read back] | (nothing reads this table) |
| `library_chunks` | library-backfill, library-embed-backfill-background | library-search (via match_library_chunks RPC), library-intelligence |
| `library_spirit_cache` | library-backfill, library-reanalyze | library-intelligence gap-analysis |
| `enrichment_rejected` | library-enrich-apply reject | library-enrich (filters) |
| `ministry_context` | admin-context | library-chunks, _shared/spiritEnrich |
| `admin_docs` | admin-docs | AdminDocs component |
| `modals` | admin-modals | (frontend modal display) |
| `spirit_of_week` | spirit-of-week POST | spirit-of-week GET |
| `spirit_of_day_cache` | spirit-of-day | spirit-of-day |
| `admin_tracker` | admin-tracker, admin-tracker-seed | TrackerView |
| `ai_usage` | (written by rate limiter lib) | admin-ai-stats |
| `ministry_sources` | admin-sources | SourcesMasterList |
| `sm_assessments` | api/sm-assessment POST/PUT | api/sm-assessment GET |
| `sm_regions` | api/sm-regions POST | api/sm-regions GET, SpiritualMappingAdmin |
| `sm_submissions` | api/sm-submission POST | api/sm-submission GET |
| `episode_attachments` | admin-episodes | admin-episodes |

**Airtable Bases Still in Active Use:**

| Airtable Base | Used By |
|---|---|
| `appVXEj2DLPBTJTtD` (Demon DB) | admin-demon GET, taxonomy-spirits, admin-taxonomy-ai, spirit-merge, spirit-of-day, library-enrich, library-intelligence, library-autofill, api/generate-field-card |
| `apph6wmOeYjovFytC` (Resources) | api/resources (GET), api/admin-upload (GET/POST/PATCH/DELETE) |
| `appLPhhHPP5rKvlKT` (Assessments/Members) | api/submit-assessment, api/assessment-board, api/generate-summary, api/mn-verify, api/submit-help |

### 3.4 AI Model Usage

| Model | Used In |
|---|---|
| claude-sonnet-4-5 | admin-chat, admin-content-ai, library-intelligence (content-query path), library-summarize, _shared/spiritEnrich |
| claude-haiku-4-5 | library-enrich-apply ai_fill_field, warroom-chat |
| claude-haiku-4-5-20251001 | library-autofill (meta + validation), library-backfill (suppressed), library-enrich (batch), submit-assessment AI generation, api/generate-summary |
| claude-sonnet-4-5-20251001 | admin-generate-document |
| claude-haiku-4-5-20251001 | library-reanalyze |

All direct API calls use `https://api.anthropic.com/v1/messages` raw fetch (not the Anthropic SDK) except `api/warroom-chat.ts` which imports `@anthropic-ai/sdk`.

OpenAI `text-embedding-3-small` is used in: library-search, library-backfill/library-embed-backfill-background, library-intelligence (content-query), admin-chat (semantic search path).

### 3.5 Spirit Field Enrichment Preamble

`_shared/spiritEnrich.ts` defines `SPIRIT_ENRICH_FIELDS` (19 fields) and `getPreamble()`. The preamble:
1. Reads `ministry_context` WHERE is_active=true
2. Reads `resources` WHERE topic='ministry-library' (for book titles/authors/notes)
3. Reads top-5 library chunks from `library-chunks` API (by keyword relevance to spirit name/description)

This preamble is injected into every spirit enrichment prompt, giving Claude context about the ministry's library before generating field values.

### 3.6 Snapshot / Restore Pattern

All writes that go through `updateSpiritBySlug()` with a meta argument automatically capture before/after snapshots per field in `spirit_apply_snapshots`. Sources:
- `'manual'` — direct admin edit via admin-demon PATCH
- `'enrich'` — AI enrichment job applied via spirit-enrich-apply
- `'library_enrich'` — library suggestion approved via library-enrich-apply
- `'taxonomy'` — taxonomy field change via admin-taxonomy-patch

Restore via `POST /api/spirit-restore-snapshot` writes `prior_value` back and stamps `restored_at`. Idempotent: returns 409 if `restored_at` already set.

The `spirit-apply-snapshots.ts` endpoint (`GET /api/spirit-apply-snapshots?spiritId=...`) returns max 50 snapshots ordered by `applied_at` desc.

### 3.7 Tier-Gated Content in Demon API

`src/routes/api.demons.ts` implements a cumulative tier-field strip (lines 17–38):
- Tier 0 (watchman/free): id, uuid, slug, name, aka, kingdom, description, phonetic, images, etc. (identity/orientation fields)
- Tier 1 (soldier+): manifestation, scripture, companionSpirits
- Tier 2 (commander+): entryPoints, legalRights, deliveranceSequence, sessionIndicators, prayerPoints, etc.
- Tier 3 (general+): symptoms, wriNotes, sourceOrigin, demonicAgreements, operationalNotes, etc.

Ministers/admins (level >= 4) receive all fields. The strip happens server-side — under-tier values are never in the response payload. `lockedSections` are returned to enable frontend "upgrade to unlock" placeholders.

### 3.8 Resource Download Signed URL Pattern

`api/resource-download.ts` and `api/resources.ts` both generate Supabase signed URLs.
- `resource-download.ts`: POST, requireAuth, checks tier vs file tier before signing (4-hour expiry)
- `resources.ts`: GET, requireAuth, filters by tier server-side, generates signed URLs when `withUrls=true`

The `resources.ts` route still reads from Airtable (base `apph6wmOeYjovFytC`), not the Supabase resources table. Arsenal admin uses the Supabase resources table. These are different data sources for what appears to be the same concept.

---

## Section 4: Gaps and Redundancies

### 4.1 Confirmed Bugs / Broken Items

**[⚠ BROKEN] admin-library.ts — table mismatch**
- `POST /api/admin-library` inserts into `ministry_library` table (`admin-library.ts` line ~80)
- `GET/PATCH/DELETE /api/admin-library` reads/writes `resources` WHERE topic='ministry-library'
- Books uploaded via the admin UI will NEVER appear in the book list
- Fix: POST should INSERT into `resources` with topic='ministry-library' and source_type='library'

**[⚠ BROKEN] ModalsAdmin — frequency field mismatch**
- Frontend shows options: `once_ever`, `once_per_day`, `every_login`
- Backend default is `'once'` in `admin-modals.ts`
- These do not match — the frequency field value written to the `modals` table will not match any frontend option
- Fix: Align backend default and accepted values to match frontend options

**[⚠ STALE AIRTABLE] spirit-merge.ts**
- Writes to Airtable only. No Supabase path. No USE_SUPABASE_DEMON_WRITES flag.
- After migration, merging spirits in Supabase is not possible via this endpoint
- The IntelArchive duplicates sub-tab that calls this will silently fail if Airtable and Supabase are out of sync

**[⚠ STUB] admin-moderation.ts**
- Returns `{ message: "Connect Stream server-side SDK" }` for all requests
- ModerationPanel, FlagsPanel, ForumModerationPanel are non-functional

**[⚠ STUB] Members tab**
- Renders "MEMBERS — COMING SOON" text only (admin.tsx:12492)

**[⚠ INCOMPLETE] admin-fix-user-tier.ts — downgrade does not remove channels**
- Only adds to Stream channels; never removes
- A user downgraded from general → soldier will retain access to commanders-room and generals-table Stream channels

### 4.2 Security Issues

**[⚠ SECURITY] library-enrich.ts — requireAuth instead of requireAdmin2**
- Any authenticated user (tier 0+) can call `POST /api/library-enrich`
- This triggers AI inference (Claude Haiku, batched) against the full ministry library
- AI usage is not metered/limited for this endpoint

**[⚠ SECURITY] library-enrich-apply.ts — requireAuth instead of requireAdmin2**
- Any authenticated user can list, approve, and reject enrichment suggestions
- Approving a suggestion writes proposed field values directly to spirits in Supabase
- An authenticated user could approve fabricated enrichment content into the demon database

**[⚠ SECURITY] spirit-equivalents.ts — requireAuth instead of requireAdmin2**
- Any authenticated user can trigger cross-cultural spirit equivalents lookup (Claude Sonnet)
- No metering

**[⚠ SECURITY NOTE] api/sm-submission.ts — POST and GET have no auth gate**
- `POST /api/sm-submission` creates submission records without any auth
- `GET /api/sm-submission` can list submissions by userId or all pending — no auth
- Only PATCH (admin approve/reject) requires requireAdmin2

**[⚠ DIFFERENT AUTH] admin-reset-dm-channels.ts**
- Uses `x-admin-secret` header matched against `ADMIN_SECRET` env var
- All other admin endpoints use Clerk JWT via requireAdmin2
- This endpoint deletes ALL Stream DM channels except 'war-room-general' and 'prayer-wall-requests' — destructive, should have higher auth standard

### 4.3 Transitional / Dual-Source Issues

**Spirit database reads still on Airtable:**
- `GET /api/admin-demon` — primary admin read path still hits Airtable
- `GET /api/taxonomy-spirits` — Taxonomy Review reads Airtable
- `POST /api/admin-taxonomy-ai` — reads Airtable for context
- `POST /api/library-enrich` — loads all Airtable records for dedup check
- `POST /api/library-intelligence` (gap-analysis) — loads Airtable names for comparison
- `POST /api/library-autofill` — loads Airtable names for dedup
- `GET /api/spirit-of-day` — reads Airtable with spirit_of_day_cache in Supabase
- `src/routes/api.generate-field-card.ts` — reads Airtable, no Supabase flag

Until `admin-demon.ts` GET is repointed to Supabase, there are two parallel spirit databases that can drift out of sync.

**Resources still on Airtable (separate resources base, not demon base):**
- `src/routes/api.resources.ts` — reads from `apph6wmOeYjovFytC` (Airtable resources base)
- `src/routes/api.admin-upload.ts` — reads/writes Airtable resources base
- Arsenal admin (`admin-resources.ts`) reads/writes Supabase `resources` table
- These appear to be the same concept (downloadable resources for members) but use different backends

### 4.4 Redundancies

**Two ministry context tabs:** `ai-command` and `ai-context` both render `MinistryContextManager` / `AICommandManager` pointing at the same `/api/admin-context`. One is redundant.

**Spirit extraction logic duplicated:** `regexExtractCandidates` / spirit scanning patterns are duplicated across `library-autofill.ts`, `library-backfill.ts`, `library-enrich.ts`, `library-reanalyze.ts`. There is a `_shared/patristicScan.ts` for the more formal scan, but the simpler regex extractions are copy-pasted.

**Two resource download paths:** `api/resource-download.ts` and `api/resources.ts` (with `withUrls=true`) both generate Supabase signed URLs using the same mechanism.

**admin-auth route retired but still registered:** `src/routes/api.admin-auth.ts` returns 410 but is kept for routeTree compilation. No functional impact.

**resources-debug route is a 404 stub:** `src/routes/api.resources-debug.ts` returns 404 for all requests.

---

## Section 5: Pre-Build Checklist

### 5.1 Before Any Spirit Database Work

- [ ] Confirm whether reading from Airtable or Supabase is intended for the specific endpoint being modified. Check the `USE_SUPABASE_DEMON_WRITES` flag and the GET vs PATCH split in `admin-demon.ts`.
- [ ] All spirit writes MUST go through `updateSpiritBySlug()` or `createSpirit()` from `spiritWrite.ts` to ensure snapshot capture. Never call `supabase.from('spirits').update()` directly in a handler that should be tracked.
- [ ] When adding a new spirit field, add it to `FIELD_DEFS` in `_shared/spiritWrite.ts` with all three names: camelCase, Airtable field name, snake column. Omitting it means the field will be silently ignored on write.
- [ ] `biblical_rank` is an enum — only the 10 values in `BIBLICAL_RANK` are valid. Any other value coerces to NULL.
- [ ] `images` and `cultural_presence` are TEXT[] columns. They must be passed as arrays or comma-separated strings. `ARRAY_COLS` in spiritWrite.ts handles normalization.
- [ ] The `tier` field visible to admins in `api.demons.ts` is cumulative: a tier-2 response includes all tier-0 and tier-1 fields too. When adding a new field, decide which tier it belongs to and add it to the correct level in both `TIER_FIELDS` and `SECTION_LABELS` in `api.demons.ts`.

### 5.2 Before Any Library Work

- [ ] The broken POST path in `admin-library.ts` must be fixed before any new library upload feature is built. Currently books uploaded via admin UI are written to `ministry_library` and never retrieved. All library book CRUD should use the `resources` table with topic='ministry-library'.
- [ ] `source_type` matters: 'arsenal' records appear in Arsenal admin; 'library' records appear in library lists. Set the correct source_type when creating new resources rows.
- [ ] `extracted_text` in the `resources` table must be populated before: library-chunks (scoring), library-intelligence (content-query fallback), admin-chat (keyword fallback), library-enrich (spirit scanning), library-summarize (patristic scan), library-search (embeddings come from library_chunks which require extracted_text).
- [ ] PDF ingestion in `library-backfill.ts` is explicitly disabled with an error message ("PDF ingestion is temporarily disabled") at line ~48. Do not assume PDFs are indexed.
- [ ] OpenAI key is required for embeddings. If `OPENAI_API_KEY` is not set, library-search returns empty, library-chunks skips embedding, and admin-chat falls back to keyword search only.
- [ ] `library_chunks` rows are the source for semantic search via `match_library_chunks` RPC. If a book has no chunks, it will not appear in semantic search results even if it has extracted_text.

### 5.3 Before Any Auth / Tier Work

- [ ] The admin frontend gate checks `publicMetadata.role === 'minister'` (admin.tsx:12251). The backend gate uses `level >= 4` (tier 'minister' or 'commandant'). Both must be satisfied. A new admin user needs both `tier: 'Minister'` AND `role: 'minister'` set in Clerk publicMetadata.
- [ ] Never use `requireAuth` for endpoints that write to the demon database or approve enrichment. Use `requireAdmin2`. The current `library-enrich.ts`, `library-enrich-apply.ts`, and `spirit-equivalents.ts` are exceptions that should be upgraded.
- [ ] `requireTier(req, N)` accepts an optional `{ allowBeta: featureName }` second parameter. The beta feature must be listed in `betaFeatures` in `_shared/access.ts`. Currently: `["session_hq", "spirit_mapper"]`.
- [ ] `admin-fix-user-tier.ts` only adds Stream channels, never removes. A downgrade flow must manually remove the user from higher-tier channels if that behavior is needed.
- [ ] The Stream channel add logic in `admin-fix-user-tier.ts` and `api/clerk-webhook.ts` uses `userId.replace(/[^a-zA-Z0-9_-]/g, '_')` to build the Stream user ID. Clerk user IDs starting with `user_` become `user_XXXXXX` — confirm this is consistent everywhere Stream is used.

### 5.4 Before Any Moderation Work

- [ ] `admin-moderation.ts` is a stub. Building real moderation requires implementing the Stream server-side SDK integration. The frontend `ModerationPanel`, `FlagsPanel`, and `ForumModerationPanel` components exist but their data fetching will fail until the backend is built.
- [ ] The 4 Stream channels in the system are: `war-room-general`, `field-reports-live`, `commanders-room`, `generals-table`. The `prayer-wall-requests` channel is also preserved by `admin-reset-dm-channels.ts`. Any new channel must be added to the KEEP set in that file to survive a DM reset.

### 5.5 Before Any Airtable-to-Supabase Migration Step

- [ ] The highest-value remaining migration task is repointing `GET /api/admin-demon` from Airtable to Supabase. Until this is done, the admin edit form loads from Airtable but saves to Supabase, creating potential field-drift if records are edited externally in Airtable.
- [ ] `spirit-merge.ts` has no Supabase path at all. Before enabling the merge feature in production, it must be rewritten to merge `spirits` rows in Supabase.
- [ ] The separate Airtable resources base (`apph6wmOeYjovFytC`) used by `api/resources.ts` and `api/admin-upload.ts` is distinct from both the demon database and the Supabase `resources` table. There are effectively three separate resource systems: (1) Airtable resources base → served by `api/resources.ts` to members, (2) Supabase resources WHERE source_type='arsenal' → served by `api/admin-resources.ts`, (3) Supabase resources WHERE topic='ministry-library' → served by `api/admin-library.ts`. Consolidation is needed before the Arsenal and Ministry Library behave consistently.

### 5.6 Environment Variable Dependencies

| Variable | Required By |
|---|---|
| `SUPABASE` (JSON: url, serviceRoleKey, bucket, signedUrlExpiry) | All Supabase endpoints |
| `AIRTABLE` (JSON: token, membersBase, membersTable, ministryRequestsTable) | All Airtable endpoints |
| `CLERK_SECRET_KEY` | requireAuth, requireAdmin2, clerk-webhook, user-tier, get-members, update-profile |
| `CLERK_WEBHOOK_SECRET` | api/clerk-webhook (Svix signature verification) |
| `ANTHROPIC_API_KEY` | admin-chat, admin-content-ai, admin-generate-document, library-autofill, library-enrich, library-enrich-apply (ai_fill_field), library-intelligence, library-reanalyze, library-summarize, warroom-chat, submit-assessment |
| `OPENAI_API_KEY` | library-search, library-backfill, library-embed-backfill-background, library-intelligence (semantic path), admin-chat (semantic path) |
| `STREAM` (JSON: apiKey, apiSecret, appId) | admin-reset-dm-channels, clerk-webhook (Stream join) |
| `ADMIN_SECRET` | admin-reset-dm-channels only |
| `INTERNAL_API_KEY` | library-search (server-to-server bypass) |

---

## Section 6: Quick-Reference Index

### Admin API Endpoints

| Endpoint | Method | Auth | Table/Service |
|---|---|---|---|
| `/api/admin-ai-stats` | GET | requireAdmin2 | ai_usage |
| `/api/admin-chat` | POST | requireAdmin2 | resources, library_chunks, ministry_context |
| `/api/admin-content-ai` | POST | requireAdmin2 | Claude (streaming JSON) |
| `/api/admin-context` | GET/POST/PATCH/DELETE | requireAdmin2 | ministry_context |
| `/api/admin-courses` | GET/POST/PATCH/DELETE | requireAdmin2 | courses, episodes |
| `/api/admin-demon` | GET | requireAdmin2 | Airtable [⚠ TRANSITIONAL] |
| `/api/admin-demon` | PATCH/POST | requireAdmin2 | spirits (Supabase) |
| `/api/admin-docs` | GET/POST/PATCH/DELETE | requireAdmin2 | admin_docs (raw REST) |
| `/api/admin-episode-upload` | POST | requireAdmin2 | episode-files bucket |
| `/api/admin-episodes` | GET/POST/PATCH/DELETE | requireAdmin2 | episodes, episode_attachments |
| `/api/admin-fix-user-tier` | POST | requireAdmin2 | Clerk + Stream |
| `/api/admin-generate-document` | POST | requireAdmin2 | Claude |
| `/api/admin-library` | GET/PATCH/DELETE | requireAdmin2 | resources (topic='ministry-library') |
| `/api/admin-library` | POST | requireAdmin2 | ministry_library [⚠ BROKEN] |
| `/api/admin-modals` | GET/POST/PATCH/DELETE | requireAdmin2 | modals (raw REST) |
| `/api/admin-moderation` | GET | requireAdmin2 | [⚠ STUB] |
| `/api/admin-notifications` | POST | requireAdmin2 | (push + email) |
| `/api/admin-quick-stats` | GET | requireAdmin2 | ai_usage, testimonies, Clerk |
| `/api/admin-reset-dm-channels` | POST | x-admin-secret | Stream [⚠ DIFFERENT AUTH] |
| `/api/admin-resources` | GET/POST/PATCH/DELETE | requireAdmin2 | resources (source_type='arsenal') |
| `/api/admin-sources` | GET/POST/PATCH/DELETE | requireAdmin2 | ministry_sources |
| `/api/admin-taxonomy-ai` | POST | requireAdmin2 | Airtable + Claude [⚠ TRANSITIONAL] |
| `/api/admin-taxonomy-patch` | PATCH | requireAdmin2 | spirits + snapshots |
| `/api/admin-tracker` | GET/PATCH | requireAdmin2 | admin_tracker |
| `/api/admin-tracker-seed` | POST | requireAdmin2 | admin_tracker |
| `/api/admin-upload` | GET/POST/PATCH/DELETE | requireAdmin2 | Airtable resources + Supabase storage |
| `/api/admin-user-search` | GET | requireAdmin2 | Clerk |
| `/api/atmosphere` | GET/POST/PATCH/DELETE | requireAdmin2 | (atmosphere) |
| `/api/enrichment-history` | GET | requireAdmin2 | ai_jobs |
| `/api/library-approve` | POST | requireAdmin2 | resources |
| `/api/library-autofill` | POST | requireAdmin2 | Airtable + Claude + resources |
| `/api/library-backfill` | POST | requireAdmin2 | resources, library_chunks, library_spirit_cache |
| `/api/library-chunks` | POST | requireAdmin2 | resources, ministry_context |
| `/api/library-embed-backfill` | POST | requireAdmin2 | resources, library_chunks (background fn) |
| `/api/library-enrich` | POST | requireAuth [⚠ SECURITY] | resources, Airtable, library_enrichment_suggestions |
| `/api/library-enrich-apply` | POST | requireAuth [⚠ SECURITY] | library_enrichment_suggestions, spirits |
| `/api/library-index` | POST | requireAdmin2 | resources, ministry-library bucket |
| `/api/library-intelligence` | POST | requireAdmin2 | resources, library_chunks, Airtable |
| `/api/library-reanalyze` | POST | requireTier(2) | resources, library_spirit_cache |
| `/api/library-search` | POST | requireAuth or x-internal-key | library_chunks (pgvector RPC) |
| `/api/library-summarize` | POST | requireAdmin2 | resources, spirit_candidates |
| `/api/library-summary` | GET | requireAdmin2 | resources |
| `/api/spirit-apply-snapshots` | GET | requireAdmin2 | spirit_apply_snapshots |
| `/api/spirit-bulk-import` | POST | requireAdmin2 | spirits |
| `/api/spirit-candidate-approve` | POST | requireAdmin2 | spirit_candidates |
| `/api/spirit-candidate-confirm` | POST | requireAdmin2 | spirits, spirit_candidates |
| `/api/spirit-candidate-enrich` | POST | requireAdmin2 | spirit_candidates, resources, Claude |
| `/api/spirit-candidates` | GET/POST | requireAdmin2 | spirit_candidates |
| `/api/spirit-enrich-apply` | POST | requireAdmin2 | ai_jobs, spirits, spirit_apply_snapshots |
| `/api/spirit-equivalents` | POST | requireAuth [⚠ SECURITY] | Claude |
| `/api/spirit-merge` | POST | requireAdmin2 | Airtable only [⚠ STALE] |
| `/api/spirit-of-week` | GET | public | spirit_of_week |
| `/api/spirit-of-week` | POST | requireAdmin2 | spirit_of_week |
| `/api/spirit-restore-snapshot` | POST | requireAdmin2 | spirits, spirit_apply_snapshots |
| `/api/taxonomy-spirits` | GET | requireAdmin2 | Airtable [⚠ TRANSITIONAL] |

### Non-Admin Endpoints

| Endpoint | Method | Auth | Notes |
|---|---|---|---|
| `/api/admin-auth` | POST | — | Retired, returns 410 |
| `/api/assessment-board` | GET | none | Published assessments (Airtable) |
| `/api/clerk-webhook` | POST | Svix signature | User created → tier + Stream |
| `/api/demons` | GET | requireAuth | spirits (Supabase, tier-stripped) |
| `/api/generate-field-card` | GET | requireTier(1) | Airtable demon by index |
| `/api/generate-summary` | POST | requireAdmin2 | Assessment AI summary (Airtable) |
| `/api/get-members` | GET | requireTier(1) | Clerk users |
| `/api/mn-verify` | GET | requireAdmin2 | Airtable members lookup |
| `/api/resource-download` | POST | requireAuth | Signed URL (tier-checked) |
| `/api/resources` | GET | requireAuth | Airtable resources (tier-filtered) |
| `/api/resources-debug` | GET | none | Returns 404 always |
| `/api/sm-assessment` | GET/POST/PUT | requireTier(2,beta:'spirit_mapper') | sm_assessments |
| `/api/sm-regions` | GET | none | Approved sm_regions |
| `/api/sm-regions` | POST | requireAuth | Create sm_region |
| `/api/sm-submission` | GET/POST | none [⚠ SECURITY] | sm_submissions |
| `/api/sm-submission` | PATCH | requireAdmin2 | Approve/reject |
| `/api/spirit-of-day` | GET | requireAuth | Airtable + spirit_of_day_cache |
| `/api/spirit-resources` | GET | requireAuth (or anon tier-0) | resources (by spirit tag) |
| `/api/submit-assessment` | POST | requireAuth | Airtable assessment submit |
| `/api/submit-help` | POST | none | Ministry help request (Airtable) |
| `/api/update-profile` | POST | requireAuth | Clerk public_metadata (bio, city, state) |
| `/api/user-tier` | GET | verifyToken | Returns tier from Clerk |
| `/api/warroom-chat` | POST | requireAuth | Claude Haiku streaming chat |
