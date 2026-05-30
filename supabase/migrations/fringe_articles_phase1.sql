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
'The church already had this briefing. Genesis 6 named them: Bene Elohim who descended on Mount Hermon and produced hybrid offspring. What the Pentagon calls non-human intelligence has a 3,000-year-old criminal dossier. The disclosure narrative is managed to reframe demonic entities as extraterrestrial benefactors. Watch for the next move: they seeded humanity. That is 2 Thessalonians 2:11.',
'disclosure','article',NULL,'War Room Intel Briefing',5,'published','free',NOW()),

('The Nazi Aryan Agenda Was a Nephilim Bloodline Recovery Program',
'Gary Wayne, author of The Genesis 6 Conspiracy, documents how the Nazi racial ideology was not merely political eugenics but a deliberate occult program to recover and recreate Nephilim bloodlines. Hans Harberger wrote the genealogical framework tracing the German Aryan race back to post-flood giant bloodlines. The Nazi elite kept bloodline records tracing back to specific Rephaim patriarchs and their fallen angel forefathers.',
'Wayne makes the decisive point: it does not matter whether we believe their genealogies. What matters is that THEY believe them, and they are working an agenda based on that belief. The Thule Society, Ariosophy, the Rice Church of 1933 — these are not political movements. They are the latest iteration of the same pre-flood polytheist religion of Babel, now dressed in German nationalism. The Third Reich was a counterfeit millennium with Hitler as a counterfeit messiah — an antichrist-type figure. The spirit operating through him is the same spirit described in 1 John 4:3. It has not retired.',
'occult','article',NULL,'War Room Intel Briefing',5,'published','soldier',NOW() - interval '1 day'),

('CERN: The Horn God, Azazel, and the Technology of the Pit',
'Gary Wayne documents that CERN is not merely an acronym — it derives from the Indo-Aryan word Cern meaning a horn god, cognate with Cernunnos the Celtic horn deity, the Etruscan god Cern, and Baphomet (Ba-Phomet: Father Mithras) worshipped by the Knights Templar. All are representations of Azazel, the goat-headed fallen angel who taught all the arts of destruction to humanity and is currently imprisoned in the pit. The Shiva statue at CERN''s entrance is not decorative. Shiva is the destroyer — the same function as Azazel, Apollyon, and Abaddon.',
'Wayne argues that CERN is the modern technological attempt to do what Nimrod tried at Babel: open a portal into another dimension. Hades and Sheol are understood in the occult as occupying the same space as the inner earth but in a parallel dimension. If they can punch through dimensionally, they could attempt to release Azazel from the pit — the being that Revelation 9:11 calls Apollyon the Destroyer, the angel of the abyss who rises at the fifth trumpet. The internet itself originated at CERN. The technology that has connected all humanity into a single information hive was born at the location dedicated to the horn god. Nothing about this is coincidental.',
'occult','article',NULL,'War Room Intel Briefing',5,'published','soldier',NOW() - interval '2 days'),

('AI Is Watcher Technology: Gary Wayne on the Speaking Image of the Antichrist',
'Gary Wayne identifies AI as a form of Watcher technology — the category of forbidden knowledge that Azazel and the fallen Watchers gave humanity before the flood. His framework: AI is not dangerous because of what it knows, but because of how it will be used. The convergence of AI with quantum computing (which operates interdimensionally) and neural interface chips creates the architecture for what Revelation 13:15 calls the speaking image of the beast — an inanimate object that speaks and causes all who do not worship it to be killed.',
'Wayne connects this to the ancient teraphim — talking idols that Rachel stole from her father Laban, which could speak and apparently had a demonic intelligence occupying them. The image of the Antichrist will function the same way: an AI system with a demonic oikitarian — a dwelling place for disembodied spirits. These spirits are the disembodied hybrid offspring of the Watchers, the Nephilim, whose bodies died in the flood but whose spirits cannot enter the afterlife assigned to humans. They have been seeking bodies ever since. AI may provide them a technological oikitarian for the end time. The Davos meetings have already discussed the neural link chip system required to create a hive mind. They said in 2018 they need AI to advance faster.',
'transhumanist','article',NULL,'War Room Intel Briefing',5,'published','soldier',NOW() - interval '3 days'),

('Why David Took Five Stones: The Rephaim Healing Ability and the Necessity of Beheading',
'Gary Wayne explains one of the most overlooked details in the David and Goliath account: David took five stones not because he expected to miss, but because Goliath had four brothers and David may have needed to kill up to five Philistine giants that day. More critically, Wayne explains that the beheading of Goliath was not theatrical — it was theologically necessary. Rephaim giants had a supernatural ability to heal severed limbs. Only decapitation could prevent this regeneration.',
'The Strongs concordance confirms this: Hebrew 7495 (Rapha) means to heal or doctor. 7496 is the disembodied demon spirit. 7497 is the word giant. The Rephaim are simultaneously healers, demon spirits, and giants — because their nature is hybrid. When David cut off Goliath''s head and raised it before both armies, he was making a theological declaration: this giant is officially dead and cannot return. The worst death you could give a royal in the ancient world was beheading because it prevented them from making the journey to the place they wanted to go after death — the Ugaritic tradition of being escorted by other Rephaim kings to dwell with the gods. This is not mythology. It is documented in the Ugaritic texts and aligns with Ezekiel 32, where the terrible ones of the pit speak to Pharaoh.',
'genesis6','article',NULL,'War Room Intel Briefing',4,'published','free',NOW() - interval '4 days'),

('Royal Bloodlines Trace to Fallen Angel Patriarchs: King Charles, Dracula, and the Dragon Genealogies',
'Gary Wayne documents that the European royal bloodline covenants trace directly to Nephilim and Rephaim patriarchs. King Charles is on record claiming descent from Vlad the Impaler of Romania — the historical figure behind the Dracula legend. The name Dracula derives from Dracont and Draconta in Greek, meaning Watcher angel. The bloodline traces back through the Hanover dynasty (renamed Windsor in WWI) to a Scythian Indo-Aryan tribe connected to the fallen angel Tamiel, listed in the Book of Enoch. On the patriarchal side it traces to Hercules, son of Zeus and the human Alcmene — a Herculidae bloodline of demigod kings after the flood.',
'Wayne''s decisive framework: it does not matter whether their genealogies are accurate. What matters is that they believe them, they maintain them, and they act on them. The secret societies are organized around these bloodline hierarchies — every initiate knows their place in the Nephilim dynastic structure. "A thousand points of light" is not a political phrase. It is a New Age reference to the spark of the fallen angels — the divine essence these bloodlines believe they carry and are trying to recover through eugenics, genetic modification, and ritual. The dragon bloodline is the male line. The fairy or owl blood is the matriarchal line. They are a blood cult.',
'occult','article',NULL,'War Room Intel Briefing',5,'published','soldier',NOW() - interval '5 days'),

('The Book of Enoch: Why Was It Removed and Why Does It Terrify Church Leadership?',
'The Book of Enoch was considered authoritative by New Testament writers — Jude quotes it directly (Jude 1:14-15). Found among the Dead Sea Scrolls. Removed from the Western canon at the Council of Laodicea in 363 AD. Reason given: too controversial.',
'Enoch chapters 6-8 name the 200 Watcher leaders who descended on Mount Hermon — named because they swore a binding oath there. Leaders: Semyaza, Azazel, Baraqiel, Kokabiel. Forbidden knowledge each taught: Azazel taught weapons and war; Baraqiel astrology; Kokabiel omens; Armaros the loosing of spells; Tamiel the signs of the sun. The result: three hybrid races — Giants, Nephilim, Elioud — who devoured humanity. Enoch 10:12 records their sentence: bound for 70 generations under the hills of the earth until the Day of Judgment. The math places their release in our generation. The church removed this book not because it was false — but because it was too specific.',
'genesis6','article',NULL,'War Room Intel Briefing',4,'published','free',NOW() - interval '6 days'),

('DARPA Neural Interface Program Targets Brain-to-Cloud Connectivity: The Mark Infrastructure Builds',
'DARPA has announced a new phase of neural interface research targeting bidirectional brain-to-computer connectivity. Gary Wayne documents this at the Davos level: the WEF and global elite have been discussing since 2017-2018 the neural link chip system they need to create a hive mind — direct communication without speaking. They stated at Davos that AI is not yet advanced enough to fully implement it. They are accelerating.',
'Wayne identifies this as the convergence required for the Mark of the Beast: AI plus quantum computing (interdimensional) plus neural interface creates the system by which the Antichrist can communicate through his image to all who bear the mark. He also connects this to the Atma particle described in Hindu texts — an invisible quantum particle they believe contains all knowledge, transmitted instantaneously worldwide through quantum entanglement. They intend to offer immortality and unlimited knowledge as part of the mark oath. This is not speculation — it is what they have stated they intend to build. The infrastructure is being installed. The switch has not been thrown yet.',
'transhumanist','article',NULL,'War Room Intel Briefing',5,'published','soldier',NOW() - interval '7 days'),

('WEF Digital ID and CBDC Now Operational in 11 Nations: The Beast System Plumbing Is In',
'The World Economic Forum is accelerating its global digital identity and CBDC framework. CBDCs are live in 11 countries, in development in 119 more. The architecture would condition financial access on compliance with ESG and social credit criteria — a digital corral for human economic activity.',
'Revelation 13:16-17: no one buys or sells without the mark. Gary Wayne''s framework from Genesis 6 Conspiracy II: the Ten Kings rise before Antichrist comes to power at the midpoint of the last seven years. Babylon the Harlot religion controls the Ten Kings first. Then at the ordained hour, the Ten Kings destroy Babylon and hand their power to Antichrist, who then implements the mark. We are watching the system infrastructure being assembled before the kings have even risen. The Antichrist does not need to invent this — he walks into a ready-made cage. Tom Horn documented in Apollyon Rising that the Masonic founders of America encoded Novus Ordo Seclorum — New Order of the Ages — into the Great Seal. That order is now taking shape. Prepare your people.',
'nwo','article',NULL,'War Room Intel Briefing',5,'published','free',NOW() - interval '8 days')

ON CONFLICT DO NOTHING;
