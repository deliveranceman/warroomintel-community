ALTER TABLE fringe_articles
  ADD COLUMN IF NOT EXISTS status        text        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tag           text        NOT NULL DEFAULT 'disclosure',
  ADD COLUMN IF NOT EXISTS source_type   text        NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS source_url    text,
  ADD COLUMN IF NOT EXISTS source_name   text,
  ADD COLUMN IF NOT EXISTS summary       text,
  ADD COLUMN IF NOT EXISTS wri_take      text,
  ADD COLUMN IF NOT EXISTS significance  integer     NOT NULL DEFAULT 3 CHECK (significance BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS tier_required text        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS published_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by   text,
  ADD COLUMN IF NOT EXISTS reviewed_at   timestamptz;

CREATE INDEX IF NOT EXISTS fringe_articles_feed_idx ON fringe_articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS fringe_articles_tag_idx ON fringe_articles (tag);

INSERT INTO fringe_articles (title, summary, wri_take, tag, source_type, source_url, source_name, significance, status, tier_required, published_at) VALUES

('Congress Hears Classified Testimony: "Non-Human Intelligence" Confirmed at Pentagon Level',
'Multiple senators and representatives have received classified UAP briefings. Witnesses describe craft and biologics of non-human origin. The term "non-human intelligence" has entered official government language for the first time in recorded history.',
'The church already had this briefing. Genesis 6 named them: Bene Elohim — sons of God — who descended on Mount Hermon and produced hybrid offspring. What the Pentagon calls "non-human intelligence" has a 3,000-year-old criminal dossier in the Book of Enoch. The disclosure narrative is being managed to reframe demonic entities as extraterrestrial benefactors. Watch for the next move: they seeded humanity. That is the setup for 2 Thessalonians 2:11.',
'disclosure','article',NULL,'War Room Intel Briefing',5,'published','free',NOW()),

('Timothy Alberino in Sardinia: Megalithic Tombs Match Nephilim Burial Accounts in Scripture',
'Explorer Timothy Alberino documents massive stone burial chambers across Sardinia. The structures use stones of staggering size — far beyond conventional Bronze Age builders. Alberino connects these to Genesis 6:4 and the Nephilim described as "mighty men of old, men of renown."',
'Enoch chapter 7 records that the Nephilim devoured all that the labour of men produced. They were not myths — they were a physical race of hybrid beings produced when Watcher angels bred with human women. The Sardinian tombs, the Peruvian megalithic sites, the cyclopean walls of Mycenae all point to the same builders. Alberino is doing the archaeology the church refuses to do.',
'genesis6','article','https://mycharisma.com/culture/timothy-alberino-sardinias-tombs-of-the-giants-reveal-nephilim-mystery/','Charisma Magazine',4,'published','free',NOW() - interval '1 day'),

('WEF Digital ID and CBDC Framework Now Operational in 11 Nations — 119 More in Development',
'The World Economic Forum is accelerating its push for a unified global digital identity layer linked to financial access. CBDCs are now live in 11 countries, with 119 nations in active development phases. The framework would allow financial participation to be conditioned on compliance criteria.',
'Revelation 13:16-17 describes a system where no one buys or sells without the mark. We are watching the plumbing being installed in real time. The Antichrist does not need to invent this infrastructure — he only needs to flip the switch. Tom Horn documented in Apollyon Rising that the Masonic founders encoded Novus Ordo Seclorum — New Order of the Ages — into the Great Seal. The order they were building toward is now taking shape.',
'nwo','article',NULL,'War Room Intel Briefing',5,'published','soldier',NOW() - interval '2 days'),

('The Book of Enoch: Why Was It Removed and Why Does It Terrify Church Leadership?',
'The Book of Enoch was considered authoritative by New Testament writers — Jude quotes it directly. It was found among the Dead Sea Scrolls. It was removed from the Western canon following the Council of Laodicea in 363 AD. The most common reason given: its content was too controversial.',
'Enoch 6-8 names the 200 Watcher leaders who descended on Mount Hermon, lists what forbidden knowledge each taught humanity — Azazel: weapons; Baraqiel: astrology; Kokabiel: omens; Armaros: spell-loosing — and describes the three-race hybrid offspring they produced. Enoch 10:12 records their imprisonment for 70 generations under the hills of the earth until the Day of Judgment. The church removed this book not because it was false — but because it was too specific.',
'genesis6','article',NULL,'War Room Intel Briefing',4,'published','free',NOW() - interval '3 days'),

('Bohemian Grove 2025: Global Elite Gather for Annual Ritual Before 40-Foot Stone Owl',
'The annual Bohemian Grove gathering in Monte Rio, California convened in July 2025. The two-week event — attended by former presidents, CEOs, military leaders, and media figures — opens with the Cremation of Care ceremony: the burning of an effigy before a towering stone owl idol.',
'The owl is Molech. Leviticus 18:21 and 20:2-5 specifically prohibit the worship of Molech — the deity associated with child sacrifice. These are not theater. This is covenant ritual performed by the most powerful men in the world before a demonic idol. Gary Wayne documents in Genesis 6 Conspiracy how Rephaim bloodline covenants were structured exactly this way — binding agreements of loyalty to fallen angelic powers, ratified through ritual and sacrifice. The same spirits that demanded child sacrifice in Canaan are receiving tribute today.',
'occult','article',NULL,'War Room Intel Briefing',5,'published','soldier',NOW() - interval '4 days'),

('DARPA Next-Generation Neural Interface Program Targets Direct Brain-to-Cloud Connectivity',
'DARPA has announced a new phase of neural interface research targeting bidirectional brain-to-computer connectivity with cloud integration. The program builds on previous Neuralink work. Stated goal: enhance soldier cognition and information processing in real-time combat environments.',
'Alberino identifies this in Birthright as the GRIN toolkit — Genetics, Robotics, Information, Nanotechnology — the four pillars of the posthuman transformation agenda. His core argument: the Mark of the Beast is not merely an economic compliance mechanism. It is a genetic and neurological modification that severs the bearer from the image of God encoded in the human genome. Once accepted, the birthright of Adam — legal dominion over the earth — transfers to the hybrid offspring of the dragon. The church is asleep on this.',
'transhumanist','article',NULL,'War Room Intel Briefing',5,'published','soldier',NOW() - interval '5 days'),

('David Flynn Cydonia Research: Face on Mars and the Sacred Geometry of the Mystery Schools',
'The late researcher David Flynn documented in Cydonia: The Secret Chronicles of Mars that the anomalous structures in the Cydonia region mirror the sacred geometry encoded in the Giza plateau. The same geometric ratios appear in both locations, suggesting a common designer.',
'Flynn identified Rahab — mentioned in Job 26:12, Psalm 89:10, and Isaiah 51:9 as a destroyed cosmic entity — as the former planet between Mars and Jupiter, now the asteroid belt. This was Lucifer''s pre-Adamic capital world, destroyed in divine judgment following his rebellion. The mystery schools preserve this knowledge at their highest degrees. Every 33rd-degree Masonic initiation encodes the geometry of Cydonia. The Face on Mars is not erosion. It is a monument to the civilization that preceded Adam.',
'disclosure','article',NULL,'War Room Intel Briefing',4,'published','free',NOW() - interval '6 days'),

('Newly Released Documents Confirm CIA-Funded Cameron Experiments at McGill University',
'Newly released Canadian government documents confirm the full scope of CIA-funded experiments conducted by Dr. Ewen Cameron at McGill from 1957-1964. Subjects were subjected to drug-induced sleep for weeks, repeated electroconvulsive therapy far above standard doses, and looped audio designed to reprogram personality.',
'Operation Paperclip imported Nazi scientists directly into the CIA. The same demonic access points that the SS Ahnenerbe exploited in Himmler''s occult research programs were being weaponized in North American universities within a decade. Springmeier documents how Monarch programming merged CIA techniques with Satanic ritual abuse, using trauma to fracture the human psyche and create controllable alter personalities. The spirit that drove Nazi human experimentation did not die in the bunker. It was given a university research grant and CIA funding.',
'occult','article',NULL,'War Room Intel Briefing',4,'published','soldier',NOW() - interval '7 days')

ON CONFLICT DO NOTHING;
