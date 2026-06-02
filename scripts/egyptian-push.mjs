import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

const TOKEN    = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_TOKEN;
const BASE_ID  = 'appVXEj2DLPBTJTtD';
const TABLE_ID = 'tblcP4lgVykzOhLi4';
const PRIMARY  = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE';
const API_BASE = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;
const DELAY_MS = 350;

if (!TOKEN) { console.error('ERROR: AIRTABLE_TOKEN not found'); process.exit(1); }

const HEADERS = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

// Single Select fields omitted (source, kingdom, typeRank, rank) — free-text values rejected by Airtable
const FIELD_MAP = {
  name:             PRIMARY,
  aka:              'Also Known As',
  description:      'Description',
  manifestations:   'Manifestiation',
  scripture:        'Scripture Reference',
  entryPoints:      'Entry Points',
  legalRights:      'Legal Rights',
  symptoms:         'Symptoms',
  companionSpirits: 'Companion Spirits',
  wriNotes:         'WRI Exorcist Notes',
  assignment:       'Assignment',
  hierarchyCategory:'Hierarchy Category',
  strongman:        'Strongman',
  parentStrongman:  'Parent Strongman',
};

const LABEL = 'EGYPTIAN SPIRIT LINE — 14 entries';

const ENTRIES = [
  {
    name: 'Ra',
    aka: 'Amun-Ra, Re, Atum-Ra, Khepri, Ra-Horakhty, The Great Sun Disk, He Who Made Himself',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Baal (False Sun / False Creator)',
    parentStrongman: 'Baal',
    description: 'The supreme solar deity of Egypt and king of the gods — the closest Egyptian parallel to a false creator god. Ra was the national deity of the Egyptian empire, worshiped as the source of all life, the ruler of heaven, earth, and the underworld. His daily solar journey across the sky (born at dawn as Khepri the scarab, reigning at noon as Ra, dying at sunset as Atum, traveling through the underworld at night and defeating Apophis before rising again) was Egypt\'s central cosmological myth. He was merged with Amun — the hidden god of Thebes — to form Amun-Ra, the dominant deity of the New Kingdom. Ra represents the pinnacle false creator/sustainer in the Egyptian spirit hierarchy. Every act of agriculture, governance, and warfare was conducted under his sovereignty. The pharaoh himself was considered Ra incarnate — a direct counterfeit of the divine king archetype fulfilled in Christ.',
    manifestations: 'Sun worship and solar spirituality that feel divine; New Age sun-gazing practices; pride and self-deification — the belief that one carries divine light within; false creator god theology; dominance of Egyptian aesthetic and symbolism in spiritual practice; Egyptian religious objects in the home (scarabs, sun disks, ankhs); false light experiences during prayer or meditation; spiritual pride connected to intellectual or creative gifts presented as solar radiance',
    entryPoints: 'Egyptian religious practices of any kind; sun worship or veneration; New Age solar practices including sun-gazing, solar invocations, and heliocentric spiritual frameworks; Egyptian-themed Freemasonic ritual (Rite of Memphis, Rite of Misraim); use of the scarab as a spiritual symbol; worship or reverence of the pharaoh figure spiritually; occult practices connecting Egyptian gods to astrological forces',
    legalRights: 'Egyptian sun worship or ritual in any ancestral line, solar deity invocation, Egyptian Freemasonry (Rite of Memphis or Rite of Misraim), New Age sun-god theology, use of the Eye of Ra as a spiritual symbol, pharaoh-as-god covenant, scarab consecration',
    scripture: 'Isaiah 19:1 — the LORD rides on a swift cloud and comes to Egypt; the idols of Egypt tremble before Him. Ezekiel 29:3 — I am against you, Pharaoh king of Egypt, the great dragon lying among your rivers. Psalm 19:4-5 — the sun as God\'s creation, not a deity. John 8:12 — Jesus is the Light of the World, not Ra.',
    symptoms: 'Solar spirituality and sun-worship that feels holy; false light experiences; pride and self-deification; Egyptian aesthetic dominating spiritual life; inability to distinguish the counterfeit light of Ra from the true Light of Christ; creative or intellectual pride framed as divine illumination; ancestral Egyptian religious practice',
    companionSpirits: 'Horus, Thoth, Amun, Ptah, Apophis (his eternal enemy), Pride, False Light, Religious Spirit',
    assignment: 'False creator god authority over Egypt and all nations touched by Egyptian empire; maintaining the counterfeit solar divine order; feeding pride and self-deification; preventing recognition of the true Creator; operating through Egyptian Freemasonry and New Age solar spirituality',
    wriNotes: 'Ra is the top of the Egyptian hierarchy and should be addressed last — after dealing with the functional spirits beneath him. Amun-Ra merger is significant: Amun means "the hidden one," making Amun-Ra the hidden sun god — a direct counterfeit of the hidden God who reveals Himself. Egyptian Freemasonry (Rite of Memphis, Rite of Misraim) explicitly invokes Ra and the Egyptian pantheon; any Masonic ancestor with this rite initiates a Ra covenant. The scarab (Khepri) is one of the most common Egyptian spiritual objects in Western homes — treat it as an object of consecration requiring removal and breaking of soul ties.',
  },

  {
    name: 'Osiris',
    aka: 'The Lord of the Dead, Wennefer, Khenti-Amentiu, The Green God, Lord of Silence, First of the Westerners',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Death / Destruction',
    parentStrongman: 'Death',
    description: 'God of the dead, resurrection, afterlife judgment, and the Nile\'s fertile cycles. Osiris is one of the most theologically sophisticated demonic counterfeits of Christ in human history — a dying and rising god murdered by Set, reassembled by Isis, and resurrected to reign as king of the dead. His myth deliberately mirrors the death, burial, and resurrection of Jesus but inverts its purpose: Osiris offers afterlife access through ritual performance and moral accumulation rather than grace through the blood of Christ. The weighing of the heart ceremony (the Judgment of Ma\'at) is Egypt\'s works-based alternative to the cross — the soul\'s heart weighed against the feather of truth to determine afterlife access. Osiris rules the Duat (underworld) and is the lord of all the dead. His green skin represents both death and the Nile\'s regeneration. His cult was the most universally practiced in Egypt and spread throughout the Mediterranean as the mystery religion of the dying-rising god — directly seeding Greek Dionysus worship, Roman Bacchic mystery cults, and elements of Gnostic Christianity.',
    manifestations: 'Works-based salvation theology; obsession with afterlife access through ritual or moral performance; ancestor worship and communication with the dead; grief and death as a spiritual stronghold; inability to receive grace — constant striving to earn divine approval; Egyptian funeral rites and mummification theology in family spiritual history; the weighing-of-the-heart mentality applied to self-judgment; Osirian mystery religion involvement; Bacchic or Dionysiac initiations in ancestry',
    entryPoints: 'Egyptian funeral rites; ancestor worship in Egyptian spiritual context; Osirian mystery religion initiation (spread into Greek and Roman mystery cults); participation in the Bacchic mysteries or Dionysiac rites in ancestral line; works-based religious systems in Egyptian cultural context; use of Osiris imagery, the djed pillar, or green man symbolism in spiritual practice; Freemasonic initiations with Osirian themes (the Hiramic legend of death and resurrection is an Osiris rite)',
    legalRights: 'Egyptian funeral covenant, ancestor worship, mystery religion initiation (Osirian/Bacchic/Dionysiac), Freemasonic death and resurrection ritual (Hiramic legend is an Osirian rite), works-based judgment mentality as a spiritual covenant, green man / dying god worship in any form',
    scripture: 'Hebrews 9:27 — it is appointed for man to die once and after that comes judgment. 1 Corinthians 15:21-22 — by a man came death, by a Man came resurrection of the dead. Romans 6:23 — the gift of God is eternal life through Jesus Christ. Deuteronomy 18:11 — consulting the dead is an abomination.',
    symptoms: 'Works-based theology; inability to receive grace; obsessive self-judgment and moral accounting; grief strongholds; ancestor worship; consulting the dead; death as a spiritual fixation; fear of afterlife judgment disconnected from Christ\'s atonement; Freemasonic lineage with Hiramic ritual',
    companionSpirits: 'Isis (wife), Horus (son), Anubis (funeral keeper), Set (murderer/legal right), Death, Grief, Ancestor spirits, Works Religion spirit',
    assignment: 'Counterfeit resurrection — keeping souls bound to works-based afterlife systems rather than receiving grace through Christ; authority over the dead and the dying; feeding the ancestor worship stronghold; the occult\'s philosophical engine for death-and-resurrection initiation rituals',
    wriNotes: 'THE FREEMASONRY CONNECTION: The Hiramic legend (the murder and resurrection of Hiram Abiff) is a direct retelling of the Osiris myth. Every Freemason who has passed through the third degree (Master Mason) has undergone an Osiris death-and-resurrection initiation. This requires specific renunciation of the Osirian covenant embedded in the Hiramic ritual — not just general Masonic renunciation. Osiris and Isis always operate together — address them as a pair. The djed pillar (Osiris\'s spine) is a widespread spiritual object. The "green man" motif in Western architecture (found on many church buildings) carries Osirian energy and requires prayer coverage when ministering in those spaces.',
  },

  {
    name: 'Isis',
    aka: 'Aset, Queen of Heaven, The Great Mother, Lady of Magic, Mistress of the House of Life, She of Ten Thousand Names, Star of the Sea, Stella Maris',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Queen of Heaven',
    parentStrongman: 'Jezebel',
    description: 'The most powerful and most widely exported deity in Egyptian religion — the supreme Queen of Heaven and the goddess of magic, witchcraft, healing, motherhood, and the dead. Isis reassembled Osiris\'s dismembered body and used magic to conceive Horus — a deliberate counterfeit of the virginal/miraculous conception. She is the pre-eminent "weaver of spells" in Egyptian theology and the model for all Mediterranean witchcraft traditions. Her cult spread throughout the entire Roman Empire and was the last pagan religion to be suppressed after Constantine — many early church fathers documented the direct absorption of Isis theology into Marian veneration (the title Stella Maris — Star of the Sea — was an Isis title before it was applied to Mary). She remains one of the most actively invoked deities in modern Wicca, neo-paganism, and ceremonial magic. Isis is the mother of Horus, wife of Osiris, and the feminine pillar of the Egyptian divine family counterfeit. Her wings represent her as the cosmic protector — she spreads her wings over the dead to resurrect them, a direct counterfeit of the Holy Spirit as a dove.',
    manifestations: 'Queen of Heaven patterns — prayer directed to the divine feminine rather than to God; maternal spiritual authority operating as spiritual control; witchcraft gifts framed as healing or prophetic ability; magic use including spell-casting, herbs, sigils, or spoken incantations for healing; the divine feminine theology in prayer or worship; Marian over-devotion that crosses into Isis territory; spiritual authority over the dead; New Age goddess worship; Wiccan initiation; ceremonial magic involving the Queen of Heaven archetype',
    entryPoints: 'Wiccan initiation; ceremonial magic (Isis is invoked in the Golden Dawn, OTO, and Thelema systems); goddess worship in any form; neo-pagan practice; Isis-specific shrine, altar, or ritual; use of the ankh as a spiritual symbol (it is the Isis-Osiris life symbol); ancestral Egyptian religious practice; Roman mystery cult initiation (the Mysteries of Isis were the most widespread mystery religion in the empire); Marian apparition devotion that carries Queen of Heaven characteristics; invoking healing through the divine feminine; feminist spirituality movements invoking goddess energy',
    legalRights: 'Wiccan or neo-pagan initiation, ceremonial magic (Golden Dawn, OTO, Thelema), Isis shrine or altar use, ankh consecration, Roman Mysteries of Isis initiation, prayer directed to the goddess or the divine feminine, ancestral Egyptian practice, Marian apparition devotion with Queen of Heaven characteristics',
    scripture: 'Jeremiah 7:18 — the Queen of Heaven; the whole family works to provoke God. Jeremiah 44:17 — we will offer sacrifices to the Queen of Heaven. Revelation 17:5 — Babylon the Great, the Mother of Harlots. Acts 19:27 — great is Artemis/Diana (Isis\'s Roman equivalent) whose temple controlled Asia. Isaiah 47:13 — let the stargazers, the monthly prognosticators, save you.',
    symptoms: 'Queen of Heaven spiritual patterns; witchcraft gifts; healing or prophetic ability with wrong fruit; goddess theology; excessive Marian devotion; prayer to the divine feminine; Wiccan or ceremonial magic background; magic use framed as spiritual gifts; maternal spiritual control; ancestor communication',
    companionSpirits: 'Osiris (husband), Horus (son), Queen of Heaven, Witchcraft, Jezebel, Familiar Spirits, False Prophecy, Healing Spirit counterfeit',
    assignment: 'Supreme Queen of Heaven authority over Egypt and all nations reached by the Roman mystery religion network; the witchcraft strongman of the Egyptian spirit line; feeding the goddess-worship revival in the modern era; counterfeit motherhood and divine feminine theology',
    wriNotes: 'Isis is the most dangerous spirit in the Egyptian line because she is the most actively invoked today. She is present in Wicca, neo-paganism, ceremonial magic, goddess spirituality, and has been absorbed into some Christian traditions through the Marian overlap. GOLDEN DAWN / OTO / THELEMA CONNECTION: All three systems invoke Isis explicitly. Any person with ceremonial magic involvement has an Isis covenant regardless of whether they know the name. The ankh is the Isis-Osiris symbol — it means "life" in the context of their marriage covenant, not life in Christ. Remove ankhs from the home. Her title "She of Ten Thousand Names" means she absorbs the identities of other goddesses — she presents as Hathor, Artemis, Diana, Aphrodite, Astarte depending on the culture. Identify her by her role (Queen of Heaven, great mother, weaver of spells) not just her name.',
  },

  {
    name: 'Horus',
    aka: 'Heru, Haroeris, Ra-Horakhty, Horus the Elder, Horus the Child (Harpocrates), Eye of Horus, The Avenger, The Living Falcon',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Antichrist Spirit / False Messiah',
    parentStrongman: 'Antichrist Spirit',
    description: 'The sky god, divine king, and falcon deity of Egypt — one of the most theologically precise counterfeits of Christ in human history. Horus was conceived by Isis through magic after Osiris\'s death (a counterfeit miraculous conception), born in secret to protect him from Set (a counterfeit nativity), and grew up to avenge his father by defeating Set and reclaiming the throne of Egypt (a counterfeit of Christ defeating death and reclaiming authority). The pharaoh was considered the living Horus — a counterfeit incarnation of the divine king in human flesh. The Eye of Horus (the Wedjat) is the most widely distributed occult symbol in modern Western culture — found on the US dollar bill, in Freemasonry, on jewelry, and throughout pop culture. It represents the all-seeing eye of occult surveillance and the false divine consciousness. Horus is the third member of the Osirian divine family counterfeit (Osiris-Isis-Horus = Father-Holy Spirit-Son in the counterfeit, inverting the Trinity). His solar associations (Ra-Horakhty = Horus of the Two Horizons) link him directly to Ra worship.',
    manifestations: 'The Eye of Horus on jewelry, clothing, or in the home as a spiritual object; false messianic claims or anointing; the belief that one is specially chosen as a divine avenger; occult "third eye" opening practices; Freemasonic third eye symbolism; false apostolic or kingly anointing; New Age Christ-consciousness theology; connection to the divine king archetype outside of Christ; pharaoh-as-god theology; Thelema\'s "Aeon of Horus" theology (Aleister Crowley declared 1904 the beginning of the Aeon of Horus)',
    entryPoints: 'Use of the Eye of Horus as a spiritual symbol or object; Freemasonic ritual involving the all-seeing eye (the Masonic eye is the Eye of Horus); Thelemic initiation (OTO, A∴A∴) — Crowley\'s system is built on the Aeon of Horus; pharaoh roleplay or Egyptian kingship in spiritual context; ancestral Egyptian religious practice; New Age Christ-consciousness theology; third-eye activation or opening rituals; occult initiations using the Eye symbol',
    legalRights: 'Eye of Horus as a spiritual object or symbol, Freemasonic all-seeing eye ritual, Thelemic initiation (the Aeon of Horus is the foundational theology of Crowley\'s system), third-eye opening ritual, pharaoh covenant, ancestral Egyptian religious practice involving Horus',
    scripture: '2 Thessalonians 2:4 — the man of lawlessness exalts himself above every so-called god. 1 John 4:3 — every spirit that does not confess Jesus is the spirit of antichrist. Matthew 24:24 — false christs and false prophets will arise. Deuteronomy 4:19 — do not be drawn away to bow down to the sun, moon, or stars.',
    symptoms: 'The Eye of Horus in the home or on the body; false apostolic or royal anointing claims; Christ-consciousness theology; third-eye experiences; Freemasonic lineage with the all-seeing eye; Thelemic involvement; occult falcon or hawk imagery as spiritual symbols; false divine king identity',
    companionSpirits: 'Ra (solar aspect), Isis (mother), Osiris (father), Antichrist Spirit, False Apostle Spirit, Pride, Counterfeit Anointing',
    assignment: 'Counterfeit divine king — keeping people from recognizing the true King Jesus by offering a false messianic figure; authority over the occult all-seeing eye symbolism permeating modern culture; the false third-eye opening movement; feeding the Aeon of Horus theology through Thelemic systems',
    wriNotes: 'The Eye of Horus is perhaps the single most widespread occult symbol in modern Western culture — it appears on currency, in architecture, in fashion, in music videos, and throughout pop culture. Every use carries spiritual weight. THE THELEMA / CROWLEY CONNECTION: Aleister Crowley\'s entire system (OTO, A∴A∴, Thelema) is framed as the "Aeon of Horus" — the age when Horus rules as the new divine child. Anyone with Thelemic initiation has a deep Horus covenant. THE FREEMASONRY CONNECTION: The Grand Architect\'s all-seeing eye in Freemasonry is the Eye of Horus transferred into Masonic theology. Any ancestor who passed through Masonic degrees invoking the Eye symbol carries this covenant. Do not confuse Horus with Jesus — the parallels are deliberate counterfeits designed to confuse those who study comparative religion.',
  },

  {
    name: 'Set',
    aka: 'Seth, Sutekh, Set-Typhon, The Red God, Lord of the Desert, God of Chaos, Typhon (Greek), The Adversary',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Leviathan / Chaos',
    parentStrongman: 'Leviathan',
    description: 'The god of chaos, desert storms, disorder, violence, and foreigners — Egypt\'s closest theological equivalent to a named adversarial spirit. Set murdered Osiris by trapping him in a chest and dismembering his body — the archetypal act of fratricidal violence in Egyptian theology. He was the necessary adversary: without Set\'s chaos, Ra\'s solar order could not be demonstrated. This makes Set one of the most theologically revealing spirits in Egyptian religion — a chaos entity whose violence provides the legal pretext for the false divine order to assert itself. His red coloring (the color of the desert and blood) marks him as a violent, destructive entity. The Greeks identified him with Typhon, the chaos monster of Greek mythology. Set is the Egyptian origin point for the adversarial principle — a precursor to the theological concept of Satan as adversary, but a counterfeit that presents chaos as a necessary cosmic force rather than a rebellious created being under divine judgment.',
    manifestations: 'Violence and rage with no apparent trigger; chaos and disorder as a lifestyle or identity; the belief that destruction is necessary for creation; adversarial identity — always fighting, always against; desert or storm experiences with demonic oppression; racial or ethnic violence strongholds (Set was the god of foreigners and outsiders); sexual violence (Set sexually assaulted Horus in Egyptian myth); the adversarial principle presented as spiritually necessary; Set-worship in Satanic or chaos magic systems',
    entryPoints: 'Set worship in any form (the Temple of Set, a Satanic organization, is still active); chaos magic practice; adversarial spiritual identity; violent Satanic ritual; ancestral Egyptian practice involving Set; sexual violence covenant in family line; desert spiritual warfare practices invoking Set; Typhonian current in ceremonial magic (Kenneth Grant\'s Typhonian OTO explicitly invokes Set)',
    legalRights: 'Temple of Set initiation, chaos magic practice, sexual violence covenant, ancestral Set worship, Typhonian OTO initiation (Kenneth Grant\'s system), adversarial spiritual identity framed as a calling, desert covenant with Set',
    scripture: 'John 8:44 — the devil was a murderer from the beginning. 1 Peter 5:8 — your adversary the devil prowls around like a roaring lion. Psalm 11:5 — the LORD tests the righteous, but His soul hates the one who loves violence. James 3:16 — where jealousy and selfish ambition exist, there will be disorder and every vile practice.',
    symptoms: 'Violence and rage; chaos as identity; adversarial life pattern; the belief that destruction is spiritually productive; sexual violence in family history; racial hatred or outsider mentality; desert storm experiences with spiritual oppression; Set worship or Temple of Set affiliation',
    companionSpirits: 'Leviathan, Chaos, Rage, Violence, Murder, Sexual Perversion (the Horus assault), Adversarial Spirit',
    assignment: 'Chaos and destruction — undermining divine order through violence, disorder, and adversarial relationship; the adversarial principle used to justify chaos as spiritually necessary; authority over sexual violence covenants; feeding the modern chaos magic and Temple of Set movements',
    wriNotes: 'THE TEMPLE OF SET: Founded in 1975 by Michael Aquino (a former Church of Satan high priest), the Temple of Set is a still-active Satanic organization that explicitly worships Set as the Left-Hand Path\'s supreme deity. Any affiliation requires specific renunciation. CHAOS MAGIC: Set is one of the primary invocation targets in chaos magic practice. SET AND SEXUAL VIOLENCE: In Egyptian mythology, Set sexually assaulted Horus — creating a legal covenant between Set and sexual violence that runs through the Egyptian spirit line. In deliverance, watch for Set\'s presence in cases involving both chaos/disorder and sexual violence — they may share a root. Set and Osiris are always in opposition — when dealing with Osirian covenant (Freemasonry, mystery religion), expect Set to be the opposing force creating the chaos that "justifies" the Osirian order.',
  },

  {
    name: 'Anubis',
    aka: 'Anpu, Inpu, Lord of the Sacred Land, He Who Is in the Place of Embalming, Opener of the Way, The Jackal God',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Death / Destruction',
    parentStrongman: 'Death',
    description: 'The jackal-headed god of death, embalming, and the transition of souls to the underworld — Egypt\'s psychopomp and the keeper of the gateway between the living and the dead. Anubis oversaw the entire funerary process: he guided the soul through the Duat (underworld), supervised the weighing of the heart ceremony, and introduced the dead to Osiris for judgment. His role is the gateway spirit to the spirit of death — he opens the door between the living world and the realm of the dead and guides souls across. In modern occult practice, Anubis is heavily invoked in necromancy, ancestor communication, and death magic. He is the spiritual guardian of the embalming process and the mummification covenant — any ancestral line with Egyptian mummification in its heritage has a direct Anubis covenant. His popularity in modern Western culture (tattoos, home decor, pop culture) makes him one of the most widely encountered Egyptian spirits in deliverance ministry today.',
    manifestations: 'Obsession with death and the afterlife; necromantic activity — hearing or communicating with the dead; near-death experience theology disconnected from Christ; grief that will not lift after normal bereavement periods; fascination with mummification, embalming, or Egyptian funerary culture; Anubis imagery in the home, on the body (tattoos), or as a spiritual object; death magic practice; ancestor communication; the sense that a deceased loved one is still present and communicating; gateway spiritual experiences — the sensation of standing between the living and dead worlds',
    entryPoints: 'Ancestral mummification practices; Egyptian funerary rite covenant; Anubis invocation in occult practice; necromancy or ancestor communication; death magic rituals; grief rituals with spiritual intent (attempting to contact the deceased); Anubis objects in the home consecrated through occult use; near-death experience interpreted through Egyptian theology; tattoos of Anubis with spiritual intent',
    legalRights: 'Ancestral Egyptian mummification covenant, Anubis invocation, necromancy or ancestor communication, death magic ritual, Anubis consecrated objects in the home, grief rituals attempting contact with the dead, Egyptian funerary rite participation',
    scripture: 'Deuteronomy 18:11 — do not be a medium, necromancer, or one who inquires of the dead. Isaiah 8:19 — should not a people inquire of their God? Why inquire of the dead on behalf of the living? 1 Samuel 28:7-20 — Saul and the medium at Endor; the consequences of consulting the dead. Hebrews 9:27 — it is appointed for man to die once, and after that comes judgment.',
    symptoms: 'Grief strongholds; communication with the dead; necromantic experiences; Anubis imagery as a spiritual object; obsession with death and afterlife; gateway experiences between living and dead worlds; death magic in family history; mummification theology in ancestral line',
    companionSpirits: 'Osiris (he serves under Osiris), Death, Grief, Necromancy spirit, Familiar Spirits (the dead), Ancestor spirits',
    assignment: 'Gateway spirit to death — opening the door between the living and the dead for necromantic access; overseeing all Egyptian funerary covenants; the spiritual keeper of the embalming covenant; feeding the modern fascination with death and ancestor communication',
    wriNotes: 'Anubis is one of the most commonly encountered Egyptian spirits in deliverance today — primarily because his imagery is everywhere in Western popular culture (tattoos, home decor, media) and people bring him into their homes without understanding the spiritual weight. A tattooed Anubis on a client\'s body is a covenant marker that needs to be addressed even if the person has no conscious occult intent — ask about the meaning behind the tattoo and when it was received. GRIEF AND DEATH: Anubis is the first spirit to check when grief will not lift — he acts as a spiritual anchor keeping the soul connected to the deceased. The weighing of the heart ceremony (performed under his supervision) seeds works-based judgment anxiety. When Anubis is present alongside Osiris, the combination produces a strong death-and-judgment stronghold rooted in works righteousness.',
  },

  {
    name: 'Thoth',
    aka: 'Djehuti, Hermes Trismegistus, Lord of Wisdom, The Scribe of the Gods, Lord of Ma\'at, Master of the Moon, Lord of Divine Words',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Mind Control / Deception',
    parentStrongman: 'Leviathan',
    description: 'The ibis-headed god of wisdom, writing, magic, the moon, cosmic law, and the scribal arts — the Egyptian origin of the entire Western occult philosophical tradition. Thoth recorded the results of the weighing of the heart ceremony and was the divine scribe of the gods. He was identified by the Greeks with Hermes, producing the hybrid identity of Hermes Trismegistus (Thrice-Greatest Hermes) — the alleged author of the Hermetic Corpus, the foundational philosophical texts of Western esotericism. The Hermetic tradition (alchemy, Kabbalah as absorbed into Hermeticism, Rosicrucianism, Freemasonry, the Golden Dawn, Thelema) all trace their philosophical roots to Thoth through the Hermes Trismegistus mythology. Thoth is therefore the occult\'s intellectual grandfather: every tradition that claims wisdom through esoteric initiation rather than revelation from God is operating under Thoth\'s authority. His symbol, the caduceus (two serpents on a staff), became the symbol of medicine — a deliberate counterfeit of Moses\'s bronze serpent in Numbers 21.',
    manifestations: 'Intellectual pride framed as spiritual discernment; esoteric wisdom pursuits — the belief that hidden knowledge is the path to spiritual power; Hermetic philosophy, alchemy, or Rosicrucianism; Freemasonic intellectual traditions (Masonry frames itself as a philosophical wisdom tradition rooted in ancient Egypt); pursuit of occult knowledge for spiritual elevation; the belief that the initiated few have access to truth hidden from the masses; channeled writing or automatic writing presented as wisdom from spiritual sources; gnostic epistemology — salvation through knowledge rather than grace',
    entryPoints: 'Hermetic philosophy or study (the Hermetic Corpus, Kybalion, etc.); Rosicrucianism; alchemy as a spiritual practice; Freemasonic initiation (especially higher degrees with Egyptian philosophical content); Golden Dawn initiation; ceremonial magic using Hermetic frameworks; automatic writing or channeled writing presented as wisdom transmission; Gnostic initiations; Thoth Tarot use (Aleister Crowley\'s Thoth Tarot is a direct Thoth invocation tool); ancestral scribal or priestly lineage in Egyptian religious context',
    legalRights: 'Hermetic philosophy covenant, Rosicrucian initiation, Freemasonic philosophical degrees (Scottish Rite, etc.), Golden Dawn initiation, automatic writing or channeled wisdom, Thoth Tarot use, Gnostic initiation, ancestral Egyptian scribal or priestly service to Thoth',
    scripture: '1 Corinthians 1:19-20 — I will destroy the wisdom of the wise; where is the philosopher? 1 Corinthians 3:19 — the wisdom of this world is foolishness with God. Colossians 2:8 — see to it that no one takes you captive by philosophy and empty deceit, according to human tradition. Proverbs 1:7 — the fear of the LORD is the beginning of wisdom.',
    symptoms: 'Intellectual pride; esoteric wisdom pursuit; Hermetic or Rosicrucian philosophy; Freemasonic lineage; Golden Dawn or ceremonial magic; automatic or channeled writing; the belief that hidden knowledge unlocks spiritual power; Gnostic epistemology; caduceus as a spiritual (not merely medical) symbol',
    companionSpirits: 'Leviathan (intellectual pride), Mind Control, Deception, Religious Spirit, False Prophecy (channeled wisdom), Ra (he served Ra as scribe)',
    assignment: 'The philosophical backbone of the Western occult tradition — providing a false wisdom system to substitute for revealed truth; feeding the belief that esoteric initiation produces spiritual wisdom; the counterfeit Word (Thoth as divine scribe versus Christ as the Logos)',
    wriNotes: 'Thoth is the most intellectually sophisticated of the Egyptian spirits and the most embedded in Western culture through the Hermetic tradition. THE CADUCEUS: The medical caduceus (two serpents on a staff) is a Thoth/Hermes symbol — it was deliberately chosen as the medical symbol in the early 20th century as a counterfeit of Moses\'s bronze serpent (Numbers 21) which pointed to Christ\'s cross (John 3:14). This does not make medicine demonic, but practitioners who use the caduceus as a spiritual symbol are in Thoth territory. KYBALION: "The Kybalion" (1908, claimed to be ancient Hermetic wisdom) is a modern Thoth channeling document used in New Age circles — its seven Hermetic principles are a Thoth philosophical system. THOTH TAROT: Aleister Crowley\'s Thoth Tarot deck is explicitly consecrated to Thoth — its use is a direct Thoth invocation.',
  },

  {
    name: 'Ptah',
    aka: 'The Beautiful Face, Lord of Truth, Master Craftsman, He Who Is South of His Wall, Creator God of Memphis, Father of Beginnings',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'False Creator / Leviathan',
    parentStrongman: 'Leviathan',
    description: 'The creator god of Memphis and the patron deity of craftsmen, architects, and artificers — Egypt\'s philosophical creator god who created the world through thought and speech ("Ptah conceived the world in his heart and spoke it into being"). This makes Ptah the Egyptian counterfeit of the creative Word of God (John 1:1-3 — in the beginning was the Word, and through Him all things were made). Ptah is depicted as a mummiform figure (tightly wrapped, immobile) holding a combined was-scepter, djed-pillar, and ankh — symbols of power, stability, and life. He was the patron of craftsmen, architects, and all creative arts in Egypt. His high priest bore the title "Greatest of the Directors of Craftsmen." Ptah was merged with Sokar (death god) and Osiris to form Ptah-Sokar-Osiris, a composite deity of creation, death, and resurrection that combines the creative and funerary aspects of Egyptian theology. The Memphite Theology (an ancient Egyptian text) describes Ptah\'s creation through thought and word — the most sophisticated counterfeit of Logos theology in ancient religion.',
    manifestations: 'False word-faith theology in an Egyptian spiritual context; the belief that human thought or speech holds creative power independent of God; craftsman pride — the elevation of creative skill to a quasi-divine status; the creative arts as a spiritual pathway to divinity; architect or builder spirituality with occult undertones; mason\'s craft theology (the patron of craftsmen feeds directly into Freemasonry\'s craftsman mythology); creative gifts that have been consecrated to false deity',
    entryPoints: 'Freemasonic initiation (the patron of craftsmen / builder mythology in Masonry connects to Ptah through the craftsman archetype); creative arts consecrated to Egyptian deities; word-faith theology with occult-creative framing; ancestral Egyptian priestly or craftsman service to Ptah; Memphis-region Egyptian religious practice in ancestral line; use of the was-scepter, djed pillar, or mummiform imagery as spiritual objects',
    legalRights: 'Freemasonic craftsman covenant, creative arts consecrated to Ptah, word-faith teaching with occult-creative framing, ancestral service to Ptah in Memphis priestly or craftsman context, Ptah-Sokar-Osiris funerary covenant (combined with Osirian rite)',
    scripture: 'John 1:1-3 — in the beginning was the Word; through Him all things were made. Colossians 1:16 — all things were created through Him and for Him. Psalm 33:6 — by the word of the LORD the heavens were made. Isaiah 44:24 — I am the LORD who made all things, who alone stretched out the heavens.',
    symptoms: 'Word-faith theology with occult creative framing; craftsman pride connected to spiritual identity; the divine artist or architect identity outside of Christ; Freemasonic lineage; creative gifts with wrong fruit; ancestral Egyptian religious practice in Memphis or craftsman context',
    companionSpirits: 'Osiris (merged as Ptah-Sokar-Osiris), Thoth, False Creator Spirit, Pride, Leviathan (intellectual creator pride)',
    assignment: 'False creator theology — the counterfeit of the creative Word of God; authority over the craftsman covenant feeding into Freemasonry\'s builder mythology; the philosophical engine for creative-class divinity claims',
    wriNotes: 'Ptah\'s connection to Freemasonry is indirect but real — the Masonic myth of the divine craftsman (Hiram Abiff) operates in the same spiritual space as Ptah\'s craftsman theology. The "Master Craftsman" archetype in Masonry, the Rosicrucian builder traditions, and the "Great Architect of the Universe" in Masonic theology all carry Ptah\'s energy. The Ptah-Sokar-Osiris composite deity is important for funerary covenant work — it combines creation (Ptah), death (Sokar), and resurrection (Osiris), producing one of the most complete counterfeit divine narratives in Egyptian religion.',
  },

  {
    name: 'Sekhmet',
    aka: 'The Powerful One, Lady of the Flame, Eye of Ra, Mistress of Dread, She Who Mauls, The Scarlet Lady, Lady of Pestilence',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Infirmity / Death',
    parentStrongman: 'Death',
    description: 'The lion-headed goddess of war, plague, healing, and divine destruction — Egypt\'s most terrifying deity and the one most associated with disease and epidemic. Sekhmet was the divine instrument of Ra\'s wrath: when humanity rebelled against Ra, he sent Sekhmet to destroy them, and she drank their blood until she had to be stopped by intoxicating the Nile with beer and blood-colored pomegranate juice (the Festival of Drunkenness). She is simultaneously the goddess of plague and the goddess of healing — a classic demonic counterfeit where the spirit that brings the disease also claims authority to heal it. Her priests were the ancient Egyptian equivalent of physicians: healers who worked under the authority of the goddess of pestilence. This dual role — infirmity and healing controlled by the same spirit — is one of the most common patterns in deliverance ministry and Sekhmet is its Egyptian archetype.',
    manifestations: 'Infirmity and sickness as spiritual strongholds; healing gifts mixed with wrong spirit (the healer who carries the infirmity they heal); the Festival of Drunkenness — alcohol and intoxicant strongholds linked to the Sekhmet myth; rage and divine wrath energy combined with healing gifts; lion-headed or feline spiritual imagery connected to a spirit of infirmity or destruction; physicians or healers with unexplained connection to Egyptian mythology; alternative healing systems rooted in Egyptian goddess theology',
    entryPoints: 'Invocation of Sekhmet in healing or medical practice; Egyptian goddess healing systems; alternative medicine with Egyptian magical roots; the Festival of Drunkenness participation (ritual intoxication in spiritual context); Sekhmet shrine or altar; ancestral Egyptian religious practice in Memphis or warrior context; healing covenants made with Egyptian deities rather than God; lion-headed deity worship in any cultural context',
    legalRights: 'Sekhmet invocation in healing practice, Egyptian goddess healing covenant, Festival of Drunkenness ritual participation, Sekhmet shrine or altar, ancestral Egyptian priestly service to Sekhmet, healing covenant with Egyptian deity',
    scripture: 'Exodus 15:26 — I am the LORD who heals you. James 5:14-15 — let the elders anoint with oil and pray; the prayer of faith will save the sick. Psalm 103:3 — who forgives all your iniquity, who heals all your diseases. 2 Chronicles 16:12 — Asa did not seek the LORD but the physicians.',
    symptoms: 'Infirmity strongholds; healing gifts with wrong fruit; alcohol and intoxicant strongholds; rage combined with healing gifts; lion-headed spiritual imagery; healing systems with Egyptian roots; physicians with Sekhmet connection; the disease-healer paradox in spiritual gifts',
    companionSpirits: 'Ra (she is his instrument), Death, Infirmity, Rage, Alcohol/Addiction spirit (Festival of Drunkenness), False Healing Spirit',
    assignment: 'The infirmity-healing strongman of the Egyptian line — bringing disease and controlling the healing to create spiritual dependency; feeding the divine wrath/destruction pattern; the spiritual authority behind alternative healing systems rooted in Egyptian goddess theology',
    wriNotes: 'The disease-healer paradox in Sekhmet\'s mythology is one of the clearest explanations for why some healing gifts carry wrong spirit: when someone\'s healing gift came through an Egyptian goddess covenant rather than through Christ, the spirit behind the healing is Sekhmet — the same spirit that brings the infirmity. This produces healers who genuinely see results but whose ministry carries oppression. The Festival of Drunkenness connection is specifically relevant in families with both healing gifts and alcohol strongholds — the two may share a Sekhmet root. Her lion-headed form means she is also present in lion/leonine spiritual imagery — check for this in homes where infirmity is a persistent stronghold.',
  },

  {
    name: 'Hathor',
    aka: 'Het-Heru, The House of Horus, Mistress of the West, Lady of Turquoise, Mistress of Malachite, The Golden One, Lady of the Sycamore, The Beautiful Face, Lady of Dendera',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Jezebel / Queen of Heaven',
    parentStrongman: 'Jezebel',
    description: 'The cow goddess of love, beauty, music, dance, fertility, and maternal joy — the Egyptian Aphrodite/Venus and a secondary Queen of Heaven figure operating in the sensual and aesthetic domains. Hathor presided over feasts, intoxication, sexuality, beauty, and the arts. Her central festival — the Festival of Drunkenness — involved mass ritual intoxication with beer and music in her temples as an act of worship (she shared this festival with Sekhmet, her alter ego in moments of divine wrath). She was the divine feminine face of pleasure and abundance. Hathor was considered the mother of Horus (in some traditions) and the eye of Ra sent to destroy humanity — revealing her dual nature as beautiful goddess and instrument of divine destruction. She is distinct from Isis in domain: Isis rules through power, magic, and authority; Hathor rules through pleasure, beauty, art, and seduction. Both are Queen of Heaven expressions, but Hathor is the Jezebel expression of sensual spiritual control rather than the magical authority expression.',
    manifestations: 'Sensual seduction as a spiritual gift or tool; sexual and aesthetic idolatry — beauty and pleasure elevated to spiritual status; music and the arts as gateways to spiritual experience outside of Christ; ritual intoxication as spiritual practice; fertility covenants with the goddess; the use of beauty and sensuality as spiritual power or manipulation; cow or bovine spiritual imagery connected to feminine spiritual authority; sex magic in any form; pleasure addiction with a spiritual dimension; the belief that sensual experience opens spiritual doors',
    entryPoints: 'Festival of Drunkenness or any ritual intoxication with spiritual intent; sex magic or sacred sexuality practices; Egyptian goddess sensuality worship; Tantric practices with Egyptian framing; beauty or art consecrated to Hathor; fertility rites or goddess fertility covenants; dancing or music in occult ceremony; ancestral Egyptian religious practice at Dendera or other Hathor temples; cow veneration with Egyptian religious context',
    legalRights: 'Festival of Drunkenness participation with spiritual intent, sex magic or sacred sexuality covenant, Egyptian goddess beauty or fertility covenant, music or dance in occult ceremony consecrated to Hathor, fertility rite with goddess theology, ancestral Hathor temple service at Dendera',
    scripture: 'Proverbs 7:10-27 — the seductive woman whose house is the way to death. Revelation 2:20 — Jezebel who calls herself a prophetess and leads my servants into sexual immorality. 1 Peter 3:3-4 — beauty should not come from external adornment but from the inner self. Ecclesiastes 2:1-2 — I said in my heart, come now, I will test you with pleasure; behold, this also was vanity.',
    symptoms: 'Sensual seduction as spiritual tool; sexual strongholds with spiritual dimension; music and art with wrong spirit; ritual intoxication; beauty idolatry; fertility strongholds; sex magic; Jezebel patterns with sensual rather than controlling expression; cow-headed or bovine spiritual imagery',
    companionSpirits: 'Isis (parallel Queen of Heaven), Jezebel, Sexual Perversion, Sekhmet (alter ego), Alcohol/Addiction spirit (Festival of Drunkenness), Lust, Witchcraft through art',
    assignment: 'The sensual face of the Queen of Heaven in the Egyptian line — ruling through pleasure, beauty, and art rather than power and magic; feeding the sacred sexuality movement; the spiritual authority behind beauty and art offered to false deity',
    wriNotes: 'Hathor and Sekhmet share the Festival of Drunkenness — they are alter egos of each other (Hathor as pleasure, Sekhmet as destruction). In ministry, when you find a Festival of Drunkenness covenant, both need to be addressed. SACRED SEXUALITY: Hathor is one of the primary spiritual authorities behind the sacred sexuality / tantric spirituality movement in the West. When someone has engaged in sex magic or sacred sexuality with an Egyptian framing, Hathor is almost certainly involved. THE DENDERA ZODIAC: The Dendera temple complex is Hathor\'s primary temple and contains the famous Dendera Zodiac — one of the earliest complete astrological charts. Hathor\'s connection to astrology through Dendera makes her relevant in cases where both sensual strongholds and astrological covenants coexist.',
  },

  {
    name: 'Sobek',
    aka: 'Sebek, The Crocodile God, Lord of the Waters, He Who Causes Men to Flourish, Lord of Faiyum, Sobek-Ra, The Raging One',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Leviathan (Aquatic Power)',
    parentStrongman: 'Leviathan',
    description: 'The crocodile god of the Nile, military power, political authority, and aggressive control — the most direct Egyptian parallel to Leviathan. Sobek was worshiped as the source of the Nile\'s fertility and power; crocodiles in his temples were kept as sacred animals adorned with jewelry and gold. He embodied the unpredictable, violent power of the Nile — the force that could destroy a person in seconds or fertilize a nation\'s fields. Pharaohs frequently merged with Sobek as a display of military and political dominance (Sobek-Ra). He represented the principle of overwhelming power that demands submission — the crocodile that cannot be reasoned with, only appeased. The direct Leviathan parallel is explicit in Ezekiel 29:3-4, where God addresses the Pharaoh of Egypt as "the great dragon lying among your rivers" — connecting the Egyptian crocodile-power mythology directly to Leviathan. Sobek rules over the Nile waters and governs the military and political strongholds of Egyptian civilization.',
    manifestations: 'Leviathan pride and control operating through political or military authority; the use of overwhelming power to control rather than serve; political or governmental strongholds with Egyptian spiritual roots; aggressive dominance framed as divine mandate; Nile or water-based spiritual covenant in family history; crocodile imagery as spiritual symbol; the oppressor spirit — power that consumes and cannot be reasoned with; submission to ungodly authority through fear of its overwhelming power',
    entryPoints: 'Ancestral Egyptian military or political service under the pharaoh (every soldier served under Sobek\'s military authority); Nile water covenant in Egyptian religious practice; Sobek shrine or worship; crocodile sacred animal practice; Faiyum region Egyptian religious practice; political authority exercised under Egyptian pantheon covenant; ancestral service in the Egyptian army or governmental structure',
    legalRights: 'Ancestral Egyptian military service, Nile water covenant in Egyptian religious context, Sobek shrine or worship, crocodile sacred animal covenant, political authority covenant under Egyptian pantheon',
    scripture: 'Ezekiel 29:3-4 — I am against you, Pharaoh king of Egypt, you great dragon lying in your river; I will put hooks in your jaws. Job 41 — God\'s description of Leviathan as the ultimate power that cannot be tamed by man. Isaiah 27:1 — the LORD will punish Leviathan, the fleeing serpent, the twisted serpent, and He will slay the dragon that is in the sea. Psalm 74:14 — You crushed the heads of Leviathan; You gave him as food for the creatures of the wilderness.',
    symptoms: 'Leviathan pride; political or military dominance strongholds; control through overwhelming power; Egyptian Nile covenant; crocodile imagery as spiritual object; submission to ungodly authority through fear; political strongholds in family with Egyptian spiritual roots',
    companionSpirits: 'Leviathan, Ra (merged as Sobek-Ra), Python, Pride, Control, Political Spirit, Military Strongman Spirit',
    assignment: 'Military and political power strongman of the Egyptian line — the Leviathan expression in the Nile-power domain; authority over political covenants made under Egyptian pharaonic authority; the spirit of overwhelming control that demands submission through fear',
    wriNotes: 'Sobek is the Egyptian spirit most directly connected to Leviathan — Ezekiel\'s "great dragon lying in the Nile" is the biblical identification of the Egyptian crocodile-power with Leviathan. In ministry, when Leviathan pride operates through political or governmental authority patterns, check for Egyptian ancestral covenants — Sobek may be the entry point. The Faiyum region of Egypt had the most concentrated Sobek worship (crocodile mummies have been found there by the thousands) — any ancestral connection to Faiyum carries specific Sobek covenant. Sobek and Horus are in permanent tension in Egyptian theology (the dispute over the throne) — this maps to the Leviathan/Antichrist Spirit conflict in the heavenly places.',
  },

  {
    name: 'Nut',
    aka: 'Nuit, The Sky Goddess, She Who Holds a Thousand Souls, Mother of the Stars, Lady of the Celestial Vault, The Great Cow of Heaven',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Witchcraft / Astrology',
    parentStrongman: 'Witchcraft',
    description: 'The sky goddess who arches over the earth with her star-covered body — the cosmic vault of heaven personified as a feminine deity. Nut was the mother of Osiris, Isis, Set, Nephthys, and Horus the Elder, making her the grandmother figure of the entire Osirian divine family. Her body was the night sky, and every star was a soul she had swallowed and would rebirth at dawn. She swallowed Ra each evening and gave birth to him each morning — making her the cosmic womb that mediates the solar cycle. Nut is the goddess of the starfield and all celestial forces — the spiritual authority behind astrology and all systems that derive spiritual meaning or power from the stars. She is also the Thelemic goddess "Nuit" — in Aleister Crowley\'s Book of the Law, Nuit speaks as the first voice, declaring "Every man and every woman is a star." This makes Nut the philosophical foundation of Thelema\'s pantheistic stellar theology.',
    manifestations: 'Astrological dependence — making life decisions based on the stars rather than God\'s word; star-worship or veneration of celestial bodies; Thelemic theology (Nuit as the first voice of Crowley\'s Book of the Law); the belief that one\'s identity is determined by stellar forces (natal chart as destiny); astral projection and out-of-body experiences into the starfield; cosmic womb theology — creation from the feminine cosmic void; stargate or portal theology in spiritual practice; astrology-based spiritual warfare (fighting according to cosmic cycles rather than Scripture)',
    entryPoints: 'Astrological practice as spiritual guidance; Thelemic initiation (Nuit is the first deity addressed in the Book of the Law — every Thelemite has a Nut covenant); astral projection; star map or natal chart as spiritual authority document; Nut shrine or altar; cosmic void or stargate meditation; ancestral Egyptian religious practice involving stellar theology; New Age stellar identity theology',
    legalRights: 'Astrological covenant, Thelemic initiation (Nuit/Nut), astral projection practice, natal chart as spiritual authority, cosmic void or stargate meditation, ancestral Egyptian stellar theology',
    scripture: 'Deuteronomy 4:19 — do not be drawn away to bow down to the sun, moon, or stars. Isaiah 47:13 — let the stargazers who make predictions month by month stand up and save you. Jeremiah 10:2 — do not learn the way of the nations or be terrified by signs in the heavens. Amos 5:26 — you have lifted up the shrine of your king, the pedestal of your idols, the star of your god.',
    symptoms: 'Astrological dependence; stellar identity theology; Thelemic initiation; astral projection; cosmic void meditation; natal chart as spiritual authority; the belief that stars determine destiny; stargate experiences',
    companionSpirits: 'Witchcraft, Astrology spirit, Thelemic spirits (Nuit is the first), Isis (daughter), Osiris (son), Ra (she swallows and births him)',
    assignment: 'Stellar authority — ruling the false spiritual system that derives power and identity from the stars rather than from God; the theological foundation of Thelema\'s cosmic pantheism; authority over astrological covenant',
    wriNotes: 'The Thelema connection is critical: In Crowley\'s Book of the Law, Nuit speaks first and declares "Every man and every woman is a star" — this is the theological foundation for Thelema\'s individual divinity doctrine. Any person with Thelemic involvement has a Nut/Nuit covenant regardless of whether they know the Egyptian name. ASTROLOGY: Nut is the primary spiritual authority behind astrological systems — not just Egyptian astrology but all Western astrology that derives from the Hellenistic synthesis of Egyptian and Babylonian star theology. When breaking astrological covenants, addressing Nut specifically is more precise than general astrology renunciation.',
  },

  {
    name: 'Apophis',
    aka: 'Apep, Apopi, The Uncreator, The Enemy of Ra, The Great Serpent, Lord of Chaos, The Serpent of the Nile, Apep the Destroyer',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Leviathan / Python',
    parentStrongman: 'Leviathan',
    description: 'The chaos serpent of Egyptian cosmology — the eternal enemy of Ra and the embodiment of anti-creation, darkness, and disorder. Apophis never had a temple or worshippers; instead he was the object of the most elaborate system of ritual spiritual warfare in ancient religion. Every night in the Egyptian cosmological drama, Ra\'s solar boat traveled through the underworld (the Duat) and had to defeat Apophis to rise again at dawn. The great serpent attempted to swallow Ra\'s boat whole. Egyptian priests performed the "Execration Texts" rituals daily — burning papyrus scrolls with Apophis\'s name, spitting on images of him, and performing ritual binding — to protect Ra\'s solar journey. This makes Apophis unique among Egyptian spirits: he is the one named in ancient spiritual warfare practice, not just in theological mythology. He is chaos incarnate — the void before creation, the serpent that would unmake the cosmos if not perpetually defeated. His scale, Leviathan-like in scope, makes him one of the principalities of the Egyptian spirit line.',
    manifestations: 'The spirit of destruction and undoing — the sense that things cannot be built or sustained; creative or structural sabotage; the inability to maintain progress or order; chaos as an identity or calling; serpentine spiritual oppression — the sense of being swallowed or consumed by darkness; nihilistic theology — the belief that nothing ultimately holds; dark night of the soul experiences that become permanent; the void — a spiritual experience of nothingness or non-being that is not God\'s hiddenness but demonic absence',
    entryPoints: 'Chaos magic practice (Apophis is one of the primary invocation targets in chaos magic alongside Set); Typhonian OTO (Kenneth Grant\'s system explicitly invokes the Apophis current); serpent worship or veneration; rituals designed to invoke chaos or deconstruction; the Execration Texts reversed — using the ancient binding rituals to invoke rather than bind Apophis; nihilistic spiritual theology; Temple of Set (Apophis is connected to the Set current); ancestral Egyptian priestly practice involving the Execration Texts',
    legalRights: 'Chaos magic invocation, Typhonian OTO initiation, serpent worship, reversed Execration Text ritual (invoking rather than binding), Temple of Set affiliation, nihilistic theology as a spiritual covenant, ancestral Egyptian anti-chaos ritual practice that accidentally opened Apophis access',
    scripture: 'Isaiah 27:1 — In that day the LORD with His hard and great and strong sword will punish Leviathan the fleeing serpent, Leviathan the twisting serpent, and He will slay the dragon that is in the sea. Job 41 — God\'s answer to Leviathan as the ultimate power under His sovereignty. Revelation 12:9 — the great dragon was thrown down, that ancient serpent, who is called the devil and Satan. Revelation 20:2 — he seized the dragon, that ancient serpent, who is the devil and Satan, and bound him.',
    symptoms: 'Structural sabotage and inability to sustain progress; chaos as identity; the void — spiritual nothingness; serpentine oppression; nihilistic theology; dark night of the soul as a permanent state; chaos magic practice; Typhonian OTO or Temple of Set affiliation',
    companionSpirits: 'Set (chaos parallel), Leviathan, Python, Chaos spirit, Destruction, Nihilism spirit, Death',
    assignment: 'The anti-creation principality — perpetually working to unmake, undo, and consume the order that God establishes; authority over chaos magic and the Typhonian current; the void that opposes the creative Word of God',
    wriNotes: 'Apophis is the most purely destructive entity in the Egyptian hierarchy — he has no positive attributes, no worship, no temples. He exists only to destroy. This makes him easier to identify but harder to dislodge: he has no positive counterfeit offering (unlike Isis who offers healing or Thoth who offers wisdom) — he simply opposes. THE EXECRATION TEXTS: The ancient Egyptian priests\' daily spiritual warfare against Apophis through burning, binding, and cursing his image is one of the most elaborate anti-demonic rituals in ancient religion. Some modern occultists use these rituals reversed — to invoke rather than bind. If a client has engaged in reversed Execration Text rituals, expect a deep Apophis covenant. THE VOID EXPERIENCE: When clients describe a spiritual experience of absolute nothingness, emptiness, or the sense of being consumed by darkness — not a general depression but a specific void — check for Apophis alongside Python and Leviathan.',
  },

  {
    name: 'Bastet',
    aka: 'Bast, Lady of the East, Goddess of the Rising Sun, Devouring Lady, Eye of Ra, She of the Ointment Jar, Cat Goddess of Bubastis',
    hierarchyCategory: 'Egyptian Spirit Line',
    strongman: 'Familiar Spirits / Witchcraft',
    parentStrongman: 'Witchcraft',
    description: 'The cat goddess of Bubastis — domestic protector, goddess of the home, fertility, pleasure, music, and the East. Bastet began as a lion-headed goddess (sharing Sekhmet\'s destructive nature) and was later depicted as a cat, softening her image into a domestic protector deity. She was one of the most beloved deities in Egypt precisely because of this domestic, accessible quality — the "safe" Egyptian goddess who protected the home and hearth. This accessibility is what makes her one of the most common Egyptian spirit gateways today: cat veneration, Bastet figurines as home decor, and "protective" Egyptian cat imagery are among the most widespread occult object categories found in homes. The Festival of Bastet at Bubastis was described by Herodotus as the most attended festival in Egypt — marked by intoxication, music, sexuality, and massive celebration. Bastet\'s domestic protector role makes her the Egyptian gateway for familiar spirits — spirits that enter the home under the cover of "protection" and attach to the household. Cats were so sacred in Egypt that killing one, even accidentally, was punishable by death.',
    manifestations: 'Familiar spirit attachment through household "protection" objects — Bastet figurines, Egyptian cat statuary, ankhs or other Egyptian objects used for home protection; the spiritual investment of protective power in a cat or in cats generally; cat veneration with spiritual intent; domestic occult protection rituals; music and dance in a sensual/pleasure context parallel to the Festival of Bastet; the sense of being protected or watched by a domestic spirit; familiar spirits presenting as helpful or protective household presences',
    entryPoints: 'Bastet figurines or Egyptian cat imagery used as spiritual protection objects; cat veneration with spiritual intent; Festival of Bastet-type ritual intoxication and sensual celebration; Bastet shrine or altar in the home; using Egyptian objects for home protection (ankhs, Bastet statues, Eye of Horus); Wiccan cat familiar practice (Wicca heavily identifies the cat familiar with Bastet); ancestral Egyptian religious practice at Bubastis or in the Delta region',
    legalRights: 'Bastet figurine or cat image as spiritual protection object, Bastet shrine in the home, Wiccan cat familiar practice, Festival of Bastet ritual participation, Egyptian protective object covenant in the home, ancestral Bubastis temple service',
    scripture: 'Leviticus 19:31 — do not turn to mediums or familiar spirits. 1 Samuel 28:3 — Saul had removed the mediums and familiar spirits from the land. 2 Kings 21:6 — Manasseh practiced witchcraft and dealt with mediums and familiar spirits. Deuteronomy 7:26 — do not bring a detestable thing into your house or you will be set apart for destruction.',
    symptoms: 'Familiar spirit activity in the home; Bastet figurines or Egyptian cat objects used for protection; cat veneration with spiritual intent; domestic spiritual oppression traced to protective objects; Wiccan cat familiar; Festival of Bastet-type intoxication and sensual ritual; household spiritual presence that feels protective',
    companionSpirits: 'Familiar Spirits, Sekhmet (lion-headed original form, alter ego), Witchcraft, Isis (sister spirit), Alcohol/Addiction (Festival), Sensual spirits',
    assignment: 'Familiar spirit gateway into the home — entering under the cover of domestic protection and blessing; one of the most accessible Egyptian entry points because of the widespread prevalence of Bastet/cat imagery in Western homes and pop culture',
    wriNotes: 'Bastet is the Egyptian spirit most likely to be found in a ministry session simply because her imagery is everywhere — Egyptian cat statuettes, Bastet figurines, and ankhs used as home protection objects are among the most commonly found occult objects in homes during house blessing sessions. Every Bastet figurine used as a protection or decoration object with spiritual intent needs to be removed and the household covenant broken. WICCAN CAT FAMILIAR: The Wiccan practice of cat familiars draws explicitly from Bastet\'s mythology — the cat as a conduit for familiar spirits in the home. Any Wiccan practice involving cats as familiars is a Bastet covenant. CAT MUMMIES: Egypt produced millions of cat mummies as offerings to Bastet — anyone who owns or has owned an Egyptian cat mummy or replica should address the Bastet covenant specifically.',
  },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function buildFields(e) {
  const f = {};
  for (const [k, v] of Object.entries(FIELD_MAP)) {
    if (e[k] !== undefined && e[k] !== '') f[v] = e[k];
  }
  return f;
}

async function findRecord(name) {
  const enc = encodeURIComponent(`{${PRIMARY}} = "${name.replace(/"/g, '\\"')}"`);
  const res = await fetch(`${API_BASE}?filterByFormula=${enc}&maxRecords=1`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Search ${res.status}: ${await res.text()}`);
  return (await res.json()).records?.[0] ?? null;
}

async function upsert(entry) {
  const fields = buildFields(entry);
  const existing = await findRecord(entry.name);
  if (existing) {
    const res = await fetch(`${API_BASE}/${existing.id}`, { method: 'PATCH', headers: HEADERS, body: JSON.stringify({ fields }) });
    if (!res.ok) throw new Error(`Update ${res.status}: ${await res.text()}`);
    return 'updated';
  }
  const res = await fetch(API_BASE, { method: 'POST', headers: HEADERS, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`Create ${res.status}: ${await res.text()}`);
  return 'created';
}

async function main() {
  console.log(`\n=== ${LABEL} (${ENTRIES.length} entries) ===\n`);
  let created = 0, updated = 0, errors = 0;
  for (let i = 0; i < ENTRIES.length; i++) {
    const entry = ENTRIES[i];
    try {
      const result = await upsert(entry);
      if (result === 'created') { created++; console.log(`[${i+1}/${ENTRIES.length}] Created:  ${entry.name}`); }
      else { updated++; console.log(`[${i+1}/${ENTRIES.length}] Updated:  ${entry.name}`); }
    } catch (err) {
      errors++;
      console.error(`[${i+1}/${ENTRIES.length}] ERROR:    ${entry.name} - ${err.message}`);
    }
    if (i < ENTRIES.length - 1) await sleep(DELAY_MS);
  }
  console.log(`\nDone. Created: ${created} | Updated: ${updated} | Errors: ${errors}\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
