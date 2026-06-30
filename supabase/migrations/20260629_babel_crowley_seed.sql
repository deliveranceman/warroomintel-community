-- ============================================================
-- BABEL FILES — Aleister Crowley exemplar seed
-- 20260629_babel_crowley_seed.sql
--
-- SHOW BEFORE APPLYING — DO NOT RUN until operator approval.
--
-- Spirit link audit (exact-token, semicolon-split, case-insensitive):
--   Tokens checked: 'the beast 666' | 'the great beast' | 'master therion'
--                   'to mega therion' | 'frater perdurabo' | 'aleister crowley'
--   Result: 0 of 6 tokens matched any spirit row. artifact_spirits → empty.
--
-- artifact_extraction_sources → empty (no cultural_dossiers row matches).
-- compiled_by = 'manual'  |  sources_count = 7
-- ============================================================

BEGIN;

-- ── 1. Placeholder relationship stubs (published=false) ──────────────────────

INSERT INTO public.artifacts
  (slug, name, artifact_type, status, classification, published, compiled_by, summary)
VALUES
  (
    'hermetic-order-golden-dawn',
    'Hermetic Order of the Golden Dawn',
    'secret_society',
    'historical',
    'unclassified',
    false,
    'manual',
    'Victorian-era magical order founded in 1888. Significant influence on Western ceremonial magic and Thelema.'
  ),
  (
    'ordo-templi-orientis',
    'Ordo Templi Orientis',
    'secret_society',
    'active',
    'unclassified',
    false,
    'manual',
    'International fraternal and religious organization. Restructured under Thelemic law by Aleister Crowley c.1913.'
  ),
  (
    'thelema',
    'Thelema',
    'religion',
    'active',
    'unclassified',
    false,
    'manual',
    'Esoteric religious philosophy founded by Aleister Crowley following reception of Liber AL vel Legis (Cairo, 1904). Central axiom: "Do what thou wilt shall be the whole of the Law."'
  )
ON CONFLICT (slug) DO NOTHING;


-- ── 2. Crowley artifact ───────────────────────────────────────────────────────

INSERT INTO public.artifacts (
  slug,
  name,
  artifact_type,
  aliases,
  summary,
  body,
  caution_level,
  caution_note,
  first_appearance,
  origin,
  status,
  classification,
  intelligence_only,
  details,
  subject_image_url,
  og_image_url,
  compiled_by,
  sources_count,
  published
) VALUES (
  'aleister-crowley',
  'Aleister Crowley',
  'person',
  'The Beast 666; The Great Beast; Master Therion; To Mega Therion; Frater Perdurabo',
  'Edward Alexander Crowley (1875–1947), self-styled "The Great Beast 666," was an English occultist, ceremonial magician, poet, painter, novelist, and mountaineer. Founder of Thelema, co-reformer of the Ordo Templi Orientis, and initiate of the Hermetic Order of the Golden Dawn. Author of Liber AL vel Legis (The Book of the Law, 1904). One of the most influential figures in modern Western esotericism.',
  'Born October 12, 1875, in Royal Leamington Spa, Warwickshire, to strict Plymouth Brethren parents. His father Edward Crowley died of cancer in 1887; the loss marked the beginning of his rebellion against Christianity.

Educated at Trinity College, Cambridge (1895–1898), where he pursued chess, poetry, and climbing. In 1898 he was initiated into the Hermetic Order of the Golden Dawn under the name Frater Perdurabo. He rose rapidly through the grades but was expelled after conflicts with MacGregor Mathers and Aleister (then Samuel Liddell) Mathers.

In 1904, while in Cairo with his wife Rose Kelly, Crowley claimed to receive a channeled text from an entity called Aiwass. The resulting document, Liber AL vel Legis (The Book of the Law), became the foundational scripture of Thelema. Its central law — "Do what thou wilt shall be the whole of the Law. Love is the law, love under will" — positioned Crowley as a prophetic figure for the incoming Aeon of Horus.

Crowley founded the A∴A∴ (Astrum Argenteum) in 1907 as a successor initiatory system to the Golden Dawn. He later absorbed and restructured the Ordo Templi Orientis (OTO), rewriting its rituals in accordance with Thelemic law.

His public activities attracted sustained notoriety. The British press labeled him "The Wickedest Man in the World." He was expelled from France in 1929, from Italy in 1923 (where he had established the Abbey of Thelema in Cefalù, Sicily). British tabloids covered his activities extensively.

Crowley's influence extends beyond his lifetime into Chaos Magic, the New Age movement, and popular culture (The Beatles, Led Zeppelin's Jimmy Page, Ozzy Osbourne, Jay-Z have all referenced or collected Crowley material). His philosophy normalizes self-will as supreme spiritual law, positioning obedience, restraint, and conventional morality as obstacles to spiritual evolution — a framing that resonates with countercultural and individualist audiences.

Intelligence note: Thelemic language ("Do what thou wilt," "93," "True Will") functions as in-group signaling. These phrases appear in music, fashion, and social media contexts in ways that may not be immediately recognizable as Thelemic recruitment markers.',
  4,
  'High-influence occultist; normalization risk for Thelemic philosophy among new recruits. Monitor for "Do what thou wilt," "93," and "True Will" rhetoric in community channels. Crowley-adjacent influencer accounts active on major platforms.',
  '1875',
  'United Kingdom',
  'historical',
  'confirmed',
  false,
  jsonb_build_object(
    'born',           'October 12, 1875',
    'died',           'December 1, 1947',
    'birthplace',     'Royal Leamington Spa, Warwickshire, England',
    'deathplace',     'Hastings, East Sussex, England',
    'nationality',    'British',
    'traditions',     jsonb_build_array('Thelema', 'Hermetic Order of the Golden Dawn', 'Ordo Templi Orientis', 'A∴A∴'),
    'notable_works',  jsonb_build_array(
                        'Liber AL vel Legis (The Book of the Law)',
                        'Magick in Theory and Practice',
                        '777 and Other Qabalistic Writings',
                        'The Confessions of Aleister Crowley',
                        'Liber ABA (Book 4)'
                      ),
    'notable_works_count', 5,
    'known_associates', jsonb_build_array(
                          'Rose Kelly (wife, 1903–1909)',
                          'Victor Neuburg (magical partner)',
                          'Leila Waddell',
                          'Karl Germer (OTO successor)'
                        )
  ),
  null,  -- subject_image_url: add portrait URL when available
  null,  -- og_image_url: add social share image URL when available
  'manual',
  7,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  aliases          = EXCLUDED.aliases,
  summary          = EXCLUDED.summary,
  body             = EXCLUDED.body,
  caution_level    = EXCLUDED.caution_level,
  caution_note     = EXCLUDED.caution_note,
  first_appearance = EXCLUDED.first_appearance,
  origin           = EXCLUDED.origin,
  status           = EXCLUDED.status,
  classification   = EXCLUDED.classification,
  details          = EXCLUDED.details,
  compiled_by      = EXCLUDED.compiled_by,
  sources_count    = EXCLUDED.sources_count,
  published        = EXCLUDED.published,
  updated_at       = now();


-- ── 3. Scripture references ───────────────────────────────────────────────────
-- Schema: artifact_scriptures(artifact_id, reference, application, sort_order)

INSERT INTO public.artifact_scriptures (artifact_id, reference, application, sort_order)
SELECT
  a.id,
  v.reference,
  v.application,
  v.sort_order
FROM public.artifacts a
CROSS JOIN (VALUES
  (
    'Revelation 13:18',
    '"Here is wisdom. Let him that hath understanding count the number of the beast: for it is the number of a man; and his number is Six hundred threescore and six." Crowley deliberately adopted "The Beast 666" as his prophetic identity, framing himself as the fulfillment of this passage in the context of the Aeon of Horus.',
    10
  ),
  (
    'Revelation 17:5',
    '"MYSTERY, BABYLON THE GREAT, THE MOTHER OF HARLOTS AND ABOMINATIONS OF THE EARTH." Thelema elevates Babylon/Babalon as a divine feminine archetype; Crowley''s Liber AL vel Legis inverts biblical condemnation into veneration.',
    20
  ),
  (
    '2 Thessalonians 2:3–4',
    '"Let no man deceive you by any means: for that day shall not come, except there come a falling away first, and that man of sin be revealed, the son of perdition; who opposeth and exalteth himself above all that is called God..." Crowley explicitly positioned himself as the prophet of a new aeon superseding Christian moral law.',
    30
  )
) AS v(reference, application, sort_order)
WHERE a.slug = 'aleister-crowley'
ON CONFLICT DO NOTHING;


-- ── 4. Traditions ────────────────────────────────────────────────────────────

INSERT INTO public.artifact_traditions (artifact_id, tradition, role, notes)
SELECT
  a.id,
  v.tradition,
  v.role,
  v.notes
FROM public.artifacts a
CROSS JOIN (VALUES
  ('Hermetic Order of the Golden Dawn', 'Initiate / Expelled Member',  'Initiated 1898; rose to Adeptus Minor; expelled 1900 following conflict with Mathers'),
  ('A∴A∴ (Astrum Argenteum)',           'Founder',                     'Founded c.1907 as successor to Golden Dawn system; Crowley served as Ipsissimus'),
  ('Ordo Templi Orientis',              'Outer Head of the Order',     'Joined OTO c.1910; rewrote all initiatory rituals per Thelemic law; served as OHO from 1925'),
  ('Thelema',                           'Prophet / Magus',             'Received Liber AL vel Legis in Cairo (April 1904); declared prophet of the Aeon of Horus')
) AS v(tradition, role, notes)
WHERE a.slug = 'aleister-crowley';


-- ── 5. Media ─────────────────────────────────────────────────────────────────
-- Two YouTube entries: one public analysis, one intelligence_only

INSERT INTO public.artifact_media (artifact_id, media_type, url, embed_id, title, caption, intelligence_only, sort_order)
SELECT
  a.id,
  v.media_type,
  v.url,
  v.embed_id,
  v.title,
  v.caption,
  v.intelligence_only,
  v.sort_order
FROM public.artifacts a
CROSS JOIN (VALUES
  (
    'youtube',
    'https://www.youtube.com/watch?v=REPLACE_WITH_EMBED_ID',
    'REPLACE_WITH_EMBED_ID',
    'Aleister Crowley: Profile and Cultural Impact',
    'Documentary analysis of Crowley''s life, philosophy, and lasting influence on Western esotericism and popular culture.',
    false,
    10
  ),
  (
    'youtube',
    'https://www.youtube.com/watch?v=REPLACE_WITH_INTEL_EMBED_ID',
    'REPLACE_WITH_INTEL_EMBED_ID',
    'Thelema Recruitment Patterns — Field Intelligence Briefing',
    'INTELLIGENCE ONLY — Analysis of how Thelemic framing is deployed in online recruitment contexts. For field team use.',
    true,
    20
  )
) AS v(media_type, url, embed_id, title, caption, intelligence_only, sort_order)
WHERE a.slug = 'aleister-crowley';


-- ── 6. Relationships to placeholder orgs ────────────────────────────────────

INSERT INTO public.artifact_relationships (from_artifact_id, to_artifact_id, relationship_type, notes, confidence)
SELECT
  crowley.id AS from_artifact_id,
  target.id  AS to_artifact_id,
  v.relationship_type,
  v.notes,
  v.confidence
FROM public.artifacts crowley
CROSS JOIN (VALUES
  ('hermetic-order-golden-dawn', 'member_of',   'Initiated 1898; expelled 1900 after conflict with Mathers leadership',          5),
  ('ordo-templi-orientis',       'founded',      'Joined OTO c.1910; became Outer Head of the Order; rewrote all rituals',        5),
  ('thelema',                    'founded',      'Received Liber AL vel Legis in Cairo, April 1904; declared prophet of Thelema', 5)
) AS v(target_slug, relationship_type, notes, confidence)
JOIN public.artifacts target ON target.slug = v.target_slug
WHERE crowley.slug = 'aleister-crowley'
ON CONFLICT (from_artifact_id, to_artifact_id, relationship_type) DO NOTHING;


-- ── 7. artifact_spirits — all tokens skipped ────────────────────────────────
-- Tokens checked against spirits.name and spirits.aka (semicolon-split):
--   'the beast 666'    → 0 matches
--   'the great beast'  → 0 matches
--   'master therion'   → 0 matches
--   'to mega therion'  → 0 matches
--   'frater perdurabo' → 0 matches
--   'aleister crowley' → 0 matches
-- No rows inserted into artifact_spirits.


-- ── 8. artifact_extraction_sources — empty ──────────────────────────────────
-- No cultural_dossiers rows match Crowley.
-- No rows inserted into artifact_extraction_sources.


COMMIT;
