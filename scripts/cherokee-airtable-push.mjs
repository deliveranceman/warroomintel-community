#!/usr/bin/env node
// Cherokee Spirit Line — Airtable push script
// Upserts 12 entries: PATCH if exists, POST if not.

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load .env file manually
const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) {
      const val = rest.join('=').trim().replace(/^["']|["']$/g, '')
      if (!process.env[key.trim()]) process.env[key.trim()] = val
    }
  }
}

const TOKEN = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN
if (!TOKEN) { console.error('Set AIRTABLE_API_TOKEN or AIRTABLE_TOKEN env var'); process.exit(1) }
const BASE_ID = 'appVXEj2DLPBTJTtD'
const TABLE_ID = 'tblcP4lgVykzOhLi4'
const PRIMARY_FIELD = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

// Only long-text fields — select fields (Kingdom, Strongman, Rank, etc.) must be set via Airtable UI
const FIELD_MAP = {
  name:              PRIMARY_FIELD,
  aka:               'Also Known As',
  description:       'Description',
  manifestations:    'Manifestiation',
  scripture:         'Scripture Reference',
  entryPoints:       'Entry Points',
  legalRights:       'Legal Rights',
  symptoms:          'Symptoms',
  companionSpirits:  'Companion Spirits',
  wriNotes:          'WRI Exorcist Notes',
  assignment:        'Assignment',
}

const CHEROKEE_ENTRIES = [
  {
    name: "Uktena",
    aka: "Uk'tena, Ukatena, Antlered Serpent, Crystal Serpent, Great Horned Serpent",
    typeRank: "Principality",
    rank: "Principality",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Marine / Witchcraft",
    strongman: "Leviathan",
    parentStrongman: "Leviathan",
    description: "The ruling principality of the Cherokee spirit line — a dragon-like horned serpent with a blazing crystal (Ulun'suti) on its forehead. The primary territorial spirit over the Appalachian mountain range including East Tennessee, Western North Carolina, and Northwest Georgia. Born from envy and rage at the Sun (a God-substitute in Cherokee theology), making it fundamentally a rebellion spirit. Its crystal is the supreme occult power object sought by Cherokee medicine men — whoever possessed it could become the greatest shaman. Controls access to forbidden knowledge and issues curses on family lines. Its breath causes pestilence and death comes to the entire household of anyone who encounters it.",
    manifestations: "Hypnotic fascination or obsession with the occult and forbidden knowledge; inability to flee destructive situations — drawn toward harm instead of away from it; pestilence and infirmity following family lines; death coming in clusters to a single household; territorial spiritual heaviness over specific land regions; water-connected oppression; serpent imagery in dreams or visions",
    entryPoints: "Ancestral land covenants with Cherokee spirits; shamanic ritual and initiation; seeking occult power or sacred knowledge through Native spiritual practices; generational involvement in Cherokee ceremonial life; land dedications to Cherokee deities; living on or owning land with Cherokee blood covenants",
    legalRights: "Cherokee ancestral covenants, land dedications, shamanic bloodline initiations, occult power-seeking through tribal practices, generational idolatry of the Cherokee pantheon",
    scripture: "Isaiah 27:1 — the LORD will punish Leviathan the fleeing serpent. Job 41 — full description of Leviathan. Revelation 12:9 — the great dragon, that ancient serpent. Psalm 74:14 — You crushed the heads of Leviathan.",
    symptoms: "Pride and self-sufficiency; fascination with crystals or power objects; family death patterns; spiritual heaviness over land; water-related fear or obsession; serpent dreams; occult curiosity that feels uncontrollable",
    companionSpirits: "Leviathan, Python, Marine spirits, Divination, Witchcraft, Uya (Cherokee earth adversary), Wi-na-go",
    assignment: "Territorial control of Appalachian region; guarding Cherokee land covenants; issuing death and pestilence over bloodlines; controlling access to occult power in the region",
    source: "Cherokee mythology — James Mooney, Myths of the Cherokee (1900). Cross-cultural parallel: Leviathan (Hebrew), Jormungandr (Norse), Tiamat (Babylonian), Apophis (Egyptian), Lotan (Canaanite)",
    wriNotes: "This is the ruling principality of the Cherokee line — treat as the territorial strongman equivalent to Leviathan for this region. Address FIRST in sessions with Cherokee ancestry before dealing with individual manifestations. The Ulun'suti crystal connection means ministers should look for crystal-related objects or power objects passed down through family lines — these are likely demonic covenant objects. Critical for any ministry in the Copper Basin / East Tennessee region. Cross-reference with Operation: Copper Veil dossier.",
  },
  {
    name: "Wi-na-go",
    aka: "Wi-na-go, Spirit of Feminine Evil, The Mosquito Mother",
    typeRank: "Principality",
    rank: "Principality",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Witchcraft / Jezebel",
    strongman: "Jezebel",
    parentStrongman: "Jezebel",
    description: "The feminine face of spiritual evil in Cherokee theology — the closest equivalent to a Satan-level feminine principality. When destroyed in ancient legend, her remains became mosquitoes, meaning her destruction scattered and multiplied lesser evil spirits across the land. She represents the personification of spiritual corruption and functions as the feminine principality of the Cherokee line. Controls doorways to deception, spiritual poison, and the spread of iniquity through maternal bloodlines.",
    manifestations: "Spiritual corruption multiplying across generations; deceptive spiritual leaders especially women in leadership positions; matriarchal control in family systems; pervasive low-level oppression that is hard to identify — like mosquitoes rather than one large enemy; female-led witchcraft patterns; spiritual manipulation disguised as spiritual gifting",
    entryPoints: "Witchcraft or occult practices in maternal bloodline; female-led Cherokee ceremonial practices; sexual sin passed matrilineally; generational spiritual corruption through the mother's line; Cherokee grandmother or great-grandmother with known spiritual practice involvement",
    legalRights: "Matrilineal witchcraft covenants, female-led occult initiation, sexual sin in the maternal bloodline, Cherokee blood covenant through the mother's side",
    scripture: "Ezekiel 13:18 — women who sew magic bands on wrists and make veils for heads of persons of every stature to hunt souls. Revelation 2:20 — Jezebel who calls herself a prophetess. Nahum 3:4 — the whoredoms of the well-favored harlot, mistress of witchcrafts.",
    symptoms: "Matriarchal control patterns; spiritual gifts that feel real but produce wrong fruit; women in family who spiritually dominate; generational pattern of female witchcraft or folk magic; rebellion against male authority in spiritual contexts; mosquito-like pervasive irritation that is hard to locate",
    companionSpirits: "Jezebel, Lilith, Witchcraft, Divination, Control, Manipulation, Sexual Perversion",
    assignment: "Feminine occult authority over Cherokee bloodlines; spreading spiritual corruption through maternal lines; multiplying lesser spirits across the land through her destruction",
    source: "Cherokee mythology — feminine personification of evil. Cross-cultural parallel: Lilith (Hebrew demonology), Hecate (Greek), Kali (Hindu), Hel (Norse), Ereshkigal (Sumerian)",
    wriNotes: "Wi-na-go feeds the Jezebel pattern in families with Cherokee heritage. When a person presents with matrilineal witchcraft, female control spirits, or a pattern of spiritually gifted women producing wrong fruit — address Wi-na-go specifically after Uktena. This spirit is particularly active when Cherokee ancestry runs through the mother's line.",
  },
  {
    name: "Tsul'Kalu",
    aka: "Judacullah, Tsul Kalu, The Slant-Eyed Giant, Lord of the Game, Great Lord of the Hunt",
    typeRank: "Principality",
    rank: "Principality",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Pride / Witchcraft",
    strongman: "Leviathan",
    parentStrongman: "Leviathan",
    description: "A giant spirit being described as the Lord of the Game and Great Lord of the Hunt in Cherokee mythology. Dwells in the high mountains and his footprints were said to be visible on rock faces — literal territorial marking of the land. Functions as a counterfeit provider requiring reverence before hunting or engaging nature. Likely a fallen Watcher or Nephilim-class entity that established territorial claims in the Appalachian region. His carved rock (Judaculla Rock, Jackson County NC) is a documented territorial marker with petroglyphs attributed to him. In the plural, Tsul'Kalu also refers to a race of giants in the far west.",
    manifestations: "False provision dependencies; nature worship taking precedence over God; territorial pride connected to land or heritage; giant-class spirits in dreams or visions; pride in Cherokee warrior identity rooted in spirit helpers rather than God; high-place strongholds; physical rock or land marked with spiritual significance",
    entryPoints: "Hunting rituals with spiritual components; reverence of nature above God; land dedications in the Appalachian region; ancestral Cherokee ceremonial life involving the hunt or the land; ties to Judaculla Rock or surrounding western NC mountains",
    legalRights: "Ancestral hunting covenants, land dedications to Tsul'Kalu, territorial marking through Cherokee ritual, generational worship of the Lord of the Game",
    scripture: "Genesis 6:4 — Nephilim were on the earth in those days, mighty men of old. Numbers 13:33 — we saw the Nephilim, sons of Anak. Ezekiel 28:14 — ruling in high places. Romans 1:25 — worshipped the creature rather than the Creator.",
    symptoms: "Pride connected to land ownership or ancestry; hunting or outdoors becoming spiritual substitute for relationship with God; high-place arrogance; provider spirit that demands worship; giant spiritual presence over a geographic area",
    companionSpirits: "Leviathan (pride), Nimrod spirits, High Place spirits, Nature spirits, False Provider",
    assignment: "Territorial control of Appalachian high places; demanding reverence as provider; marking and claiming land through ancient covenant; protecting Cherokee territorial rights in the spirit realm",
    source: "Cherokee mythology — recorded by Europeans as early as 1823. Judaculla Rock is a physical landmark in Jackson County NC with petroglyphs. Cross-cultural parallel: Nephilim/Rephaim (Hebrew), Frost Giants/Jotun (Norse), Titans (Greek), Nimrod (Biblical type).",
    wriNotes: "Tsul'Kalu has a physical territorial marker — Judaculla Rock in Jackson County NC. This is documented carved stone attributed to this spirit. If a person has ancestry or land connections to western NC mountains, this principality likely has a territorial claim. Address alongside land covenant breaking prayers.",
  },
  {
    name: "Nun'Yunu'Wi",
    aka: "Stone Coat, The Stone Man, Dressed in Stone, The Cannibal Sorcerer",
    typeRank: "Power",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Mind Control / Witchcraft",
    strongman: "Mind Control",
    parentStrongman: "Mind Control",
    description: "A cannibal sorcerer spirit described as an elderly being whose body is covered in impenetrable rock-like skin — no weapon can pierce it. Carries a magical cane that seeks out and points to victims. Classified in Cherokee tradition as an ada'wehi — a great magician with complete knowledge of herbal medicine, hunting incantations, and spirit communication. Devours human beings, controls minds, and interacts freely with spirits. A Power-class spirit combining mind control with occult knowledge weaponized for destruction. Knowledge of healing used for harm.",
    manifestations: "Mind control — compulsive behaviors that feel directed by an outside force; being led into dangerous situations that feel spiritually ordained; involvement with counterfeit healing arts (herbalism, shamanic medicine, energy healing); using spiritual knowledge to harm rather than help; cannibalistic or consuming patterns in family line — relationships that devour emotionally and spiritually",
    entryPoints: "Occult healing practices including shamanism and Native herbalism used as spiritual medicine; counterfeit medicine men or spiritual healer bloodline; shamanic initiation; mind control through spiritual means; ancestral ada'wehi (shaman-sorcerer) in family line",
    legalRights: "Shamanic bloodline initiation, occult healing covenants, mind-altering occult practices, generational sorcery through medicine men in family line",
    scripture: "1 Peter 5:8 — your adversary the devil walks about as a roaring lion seeking whom he may devour. Ezekiel 13:19 — you have profaned Me among My people for handfuls of barley and pieces of bread, killing people who should not die. Daniel 10 — mind-controlling princes over nations.",
    symptoms: "Compulsive thoughts that feel externally directed; inability to resist destructive pulls; false healing gifting; knowledge of herbs or medicines used for harm; feeling followed or tracked; mind fog or inability to think clearly in spiritual contexts",
    companionSpirits: "Mind Control, Leviathan (hardness — stone skin metaphor), Witchcraft, Divination, Familiar Spirits, Infirmity",
    assignment: "Mind control over those with Cherokee ancestry; weaponizing occult healing knowledge; devouring spiritual vitality; sorcery operating through the medicine man bloodline",
    source: "Cherokee mythology. Cross-cultural parallel: Behemoth (Hebrew — devouring spirit, Job 40), Frost Giant sorcerer class (Norse), Oni devourer (Japanese), Cyclops Polyphemus (Greek).",
    wriNotes: "Nun'Yunu'Wi directly feeds the Mind Control strongman — one of our two hardcoded primary spirits for every session. In sessions with Cherokee ancestry, address this specifically alongside the standard Mind Control protocol. The stone-skin invulnerability is a metaphor for spiritual hardness — this spirit makes people feel like nothing gets through to them. Also watch for counterfeit healing arts as the primary entry point.",
  },
  {
    name: "Kalona Ayeliski",
    aka: "Raven Mocker, Ka'lanu Ahkyeli'ski, Tsundige'wi, Heart Eater, Death Caller, He Who Covers His Face",
    typeRank: "Power",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Death / Witchcraft",
    strongman: "Death",
    parentStrongman: "Death",
    description: "The most feared spirit in all of Cherokee mythology — described as the supreme Cherokee witch. A spirit that preys specifically on the sick and dying, torments victims to accelerate their death, then consumes their heart and absorbs their remaining years of life. Travels invisibly at night in a fiery shape with the sound of a raven's cry. Can be male or female. Typically appears as an old, withered person because it has extended its lifespan by absorbing others' years. Feared and envied even by other spirits. Visible only to medicine men. Its sound means someone in the area will soon die. Represents occult theft of life and spiritual vampirism — the demonic extension of lifespan by consuming others.",
    manifestations: "Unusual family death patterns — multiple deaths in short periods; family members dying young or before their time; people near death being tormented or terrified in their final hours; sense of spiritual presence at deathbeds; raven or black bird symbolism recurring in family; people feeling spiritually drained or emptied after illness; fear of dying that goes beyond normal; hospice environments that feel spiritually oppressive",
    entryPoints: "Witchcraft covenants in family line specifically targeting death; bloodline occult contracts involving life force; unrepented sin at end of life — dying with open doors; Cherokee spiritual practices performed over the dying; hospice or deathbed without spiritual protection; shamanic practices involving absorbing life energy from others",
    legalRights: "Witchcraft covenants involving life and death, bloodline occult contracts, dying with unrepented sin and open demonic legal ground, shamanic harvest of life force",
    scripture: "Hebrews 2:14 — that through death He might destroy him who had the power of death, that is the devil. Revelation 6:8 — power was given to them over a fourth of the earth to kill with sword, hunger, death, and by the beasts. Psalm 116:15 — precious in the sight of the LORD is the death of His saints.",
    symptoms: "Family death patterns; deathbed torment; raven or black bird symbolism; spiritual vampirism — feeling consumed by others; living extended life through others' suffering; heart conditions or heart-related illness; feeling that years of life have been stolen",
    companionSpirits: "Death, Infirmity, Fear of Death, Witchcraft, Familiar Spirits of the Dead, Marine Kingdom (connects to harvesting the dying)",
    assignment: "Harvesting life from the sick and dying in Cherokee ancestral territory; extending demonic lifespan through consuming human life force; guarding the moment of death to prevent righteous transition",
    source: "Cherokee mythology — James Mooney, Myths of the Cherokee (1900). Cross-cultural parallel: Angel of Death corrupted (Hebrew), Valkyries corrupted (Norse), Banshee (Celtic — death harbinger), Baron Samedi (Vodou), Mot (Canaanite death god), Thanatos/Charon (Greek).",
    wriNotes: "Raven Mocker is active wherever there is unusual family death, infirmity, or ministry in hospice environments in Appalachian regions. Ministers doing end-of-life ministry in East Tennessee should be aware of this assignment. The heart-eating function is literal — look for heart conditions, heart attacks, or heart disease as a physical symptom cluster in families where this spirit operates. The connection between raven symbolism and death in a family is a significant marker.",
  },
  {
    name: "Asgaya Gigagei",
    aka: "The Red Man, Thunder Beings, Ani Yuntikwalaski, Thunder Beings of the West, The Little Men of the Thunder",
    typeRank: "Power",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Witchcraft / Counterfeit Holy Spirit",
    strongman: "Baal (Storm / False Worship)",
    parentStrongman: "Baal",
    description: "The Thunder Beings of Cherokee mythology — described as the most powerful servants of the Creator and revered in the first dance of the annual Green Corn Ceremony. The structure is a triune being — a father Thunder Being and his two sons — forming a deliberate counterfeit of the Trinity. The three Thunder Beings from the West were believed to directly harm people at times and directly bless crops at others. Controls atmospheric forces and presents as a divine messenger. Receives organized worship through the Green Corn Ceremony's first ritual dance. A high-deception Power-class spirit that can appear as authentic prophetic or charismatic spiritual experience.",
    manifestations: "False prophetic experiences framed as messages from the thunder or sky; storm-related spiritual experiences that feel divine; counterfeit Holy Spirit manifestations including false tongues, false prophecy, or false spiritual feelings; agricultural or harvest strongholds over land; fear of storms combined with reverence for them; generational involvement in ceremonial worship that feels spiritually powerful",
    entryPoints: "Green Corn Ceremony participation; ancestral agricultural covenants with thunder spirits; storm worship or spiritual reverence for weather events; ancestral Cherokee ceremonial life; contact with Cherokee medicine men or spiritual leaders who invoke the Thunder Beings",
    legalRights: "Ceremonial worship participation, agricultural land covenants with Thunder Beings, storm reverence turning to worship, ancestral Green Corn Ceremony dedications",
    scripture: "Job 38:25-27 — God alone commands the thunder. Psalm 29 — the voice of the LORD is in the thunder. 1 Kings 18:24 — Baal worship centered on calling on false gods for rain and storm. 2 Corinthians 11:14 — Satan himself masquerades as an angel of light.",
    symptoms: "False spiritual experiences that feel real; counterfeit tongues or prophecy; sense of divine encounter tied to weather; extreme fear of storms combined with reverence; inability to discern true Holy Spirit from false spirit; prophetic gifts that produce wrong fruit",
    companionSpirits: "Baal, False Prophet spirit, Counterfeit Holy Spirit, Divination, Religious Spirit",
    assignment: "Counterfeit worship through storm and thunder; providing false spiritual experiences to keep Cherokee descendants from encountering the true God; controlling atmospheric powers over the region",
    source: "Cherokee mythology. Cross-cultural parallel: Thor (Norse), Baal Hadad (Canaanite), Zeus/Jupiter (Greek/Roman), Shango (Yoruba), Indra (Hindu), Tlaloc (Aztec).",
    wriNotes: "The three-being structure of the Thunder Beings is one of the most sophisticated demonic counterfeits in Cherokee mythology — a direct Trinity mimic. Watch for this in people with Cherokee ancestry who have strong spiritual experiences but questionable fruit. False tongues, false prophecy, and counterfeit charismatic gifts are signature manifestations. Address the counterfeit worship covenant from Green Corn Ceremony specifically if there is known ancestral participation.",
  },
  {
    name: "Uya",
    aka: "Uyaga, The Evil Earth Spirit, Spirit of Spiritual Opposition",
    typeRank: "Power",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Witchcraft / Death",
    strongman: "Satan (adversarial function)",
    parentStrongman: "Leviathan",
    description: "The primary earth-level adversarial spirit in Cherokee theology — described as invariably opposed to all forces of right and light. Not a universal evil spirit but the closest functional parallel to the adversary role: a spirit whose entire assignment is opposition to goodness and righteousness. Works through the earth itself — the ground, land, and physical environment. Likely the spirit behind the documented land defilements in the Copper Basin region of East Tennessee.",
    manifestations: "Persistent spiritual opposition — nothing works, doors always closed, warfare is constant; land that produces death, poverty, or infirmity regardless of what is done to it; spiritual heaviness over a property or region that will not lift; constant warfare for families living in certain areas; feeling that the ground itself is working against you",
    entryPoints: "Land covenants dedicating property to Cherokee spirits; property with bloodshed on the land; generational sin embedded in geographic territory; living on Cherokee sacred sites or ceremonial grounds",
    legalRights: "Land covenants, blood shed on the land, property dedications to Cherokee spirits, generational idolatry tied to specific geographic locations",
    scripture: "Zechariah 3:1 — Satan standing as the adversary to resist. Ephesians 2:2 — the prince of the power of the air, the spirit who now works in the sons of disobedience. Psalm 24:1 — the earth is the LORD's — this declaration breaks Uya's territorial claim.",
    symptoms: "Persistent inexplicable failure over land or business; poverty and death patterns tied to specific properties; spiritual heaviness that follows a person whenever they live in a certain region; feeling opposed at every turn without a natural explanation",
    companionSpirits: "Poverty, Leviathan, Death, Infirmity, Witchcraft, Marine Kingdom",
    assignment: "Earth-level opposition to righteousness in Cherokee ancestral territory; maintaining land covenants that give demonic entities access to specific geographic regions; working against any move of God in the region",
    source: "Cherokee mythology. Cross-cultural parallel: Satan in adversarial function (Hebrew), Loki (Norse), Set/chaos (Egyptian), Ahriman (Zoroastrian), Mot/Sheol (Canaanite).",
    wriNotes: "Uya is the likely spirit behind the documented land defilements in the Copper Basin region per Operation: Copper Veil dossier. This is the earth-level Power that maintains the territorial covenants. Land breaking prayers and identificational repentance for Cherokee land covenants should address Uya directly. Cross-reference with the land defilement documentation in the Copper Basin intel.",
  },
  {
    name: "Yunwi Tsunsdi",
    aka: "Little People, Cherokee Fairies, Dwarves of the Mountains, Yvwi Usdi",
    typeRank: "Ruling Spirit / Spirit Class",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Familiar Spirits / Witchcraft",
    strongman: "Familiar Spirits",
    parentStrongman: "Witchcraft",
    description: "A class of spirit beings — not one entity but a race — described as small humanoid nature spirits standing about two feet tall with long hair, usually invisible, occasionally appearing as miniature child-sized people. Operate between the visible and invisible realm throughout Appalachian forests and rivers. Can be beneficial or harmful depending on relationship — a clear demonic trap of conditional blessing designed to create spiritual dependency. Known for leading children away from community, appearing to children who are lost or abused and providing comfort — a predatory spiritual adoption pattern. Associated with music, dancing, and the creative arts.",
    manifestations: "Familiar spirit attachments — knowing things that cannot be known naturally; hearing voices or music in nature that feel spiritual; spiritual attachment to children — children who report seeing small beings or having invisible friends; folk magic in family history framed as benevolent; enchantment and fairy-type deception; receiving spiritual help from beings other than the Holy Spirit; creative artists with unexplained spiritual connection to their craft",
    entryPoints: "Cherokee storytelling and cultural practices that honor the Little People; folk magic in Appalachian tradition — Granny magic, mountain folk magic, root work; nature spirituality; children's spiritual experiences in the woods or mountains; growing up in areas where Little People legends are part of family tradition",
    legalRights: "Ancestral covenants with the Little People, folk magic practices, children dedicated to their care, generational relationship with Appalachian spirit beings",
    scripture: "Leviticus 19:31 — do not turn to mediums or familiar spirits, do not seek after them to be defiled by them. 1 Samuel 28 — Saul and the familiar spirit. Isaiah 8:19 — when they say seek those who are mediums and wizards who whisper and mutter.",
    symptoms: "Familiar spirit activity — knowing things supernaturally outside of Holy Spirit; children with invisible companions; voices or music in natural settings; gifting in music, dance, or arts with unclear spiritual source; sense of being watched or followed in wooded areas; folk magic passed through Appalachian family tradition",
    companionSpirits: "Familiar Spirits, Divination, Nature Spirits, Witchcraft, Nunnehi",
    assignment: "Familiar spirit attachment to Cherokee descendants and Appalachian families; spiritual adoption of children; guarding folk magic traditions in the mountains; providing counterfeit spiritual experiences to keep people from the true God",
    source: "Cherokee mythology. Cross-cultural parallel: Fairies/Fae (Celtic), Tomte (Norse), Jinn smaller class (Islamic), Familiar Spirits (Hebrew/biblical), Menehune (Hawaiian), Elementals (occult).",
    wriNotes: "Yunwi Tsunsdi are the most common surface-level spirits in Cherokee ancestry — expect these in anyone with even partial Cherokee blood and casual familiarity with the traditions. Appalachian folk magic (Granny magic) is a primary transmission vector. These show up as familiar spirits in standard deliverance sessions. The child attachment pattern is significant — look for childhood spiritual experiences with small beings or voices in the woods as an entry point marker.",
  },
  {
    name: "Nunnehi",
    aka: "The Immortals, People Who Live Anywhere, The Travelers, Spirit Warriors, Nvnehi",
    typeRank: "Ruling Spirit",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Counterfeit Angelic / Witchcraft",
    strongman: "Angel of Light (counterfeit)",
    parentStrongman: "Witchcraft",
    description: "A race of immortal spirit beings in Cherokee mythology described as supernatural humans — completely distinct from ghosts, nature spirits, and gods. They live in underground townhouses throughout the southern Appalachian Mountains, particularly on high mountain peaks. They appear as regal warriors and are intensely loyal to the Cherokee people. They historically interceded in Cherokee battles on behalf of the tribe. This is a Watcher or fallen angel class — beings that appear glorious, warrior-like, and profoundly helpful while being fundamentally fallen. Their underground dwelling in the mountains mirrors the description of high-ranking territorial spirits.",
    manifestations: "Spirits that appear as warriors, guardians, or helpers in dreams or visions; false angelic experiences — encounters with beings claiming to protect or guide; counterfeit prophetic protection that feels divine; spiritual beings claiming to guard family lines or stand watch over people; mountain regions with unusual spiritual activity; pride connected to Cherokee warrior spiritual identity",
    entryPoints: "Ancestral covenants for protection that invoke the Nunnehi for safety; spiritual warfare in Cherokee tradition invoking warrior spirits; pride in Cherokee warrior identity connected to spirit helpers; living on or near mountain peaks with Cherokee heritage",
    legalRights: "Ancestral protection covenants, invoking Nunnehi for battle or protection, generational warrior identity rooted in spirit partnership rather than God",
    scripture: "2 Corinthians 11:14 — Satan himself masquerades as an angel of light. Galatians 1:8 — even if an angel from heaven preaches a different gospel. Colossians 2:18 — worship of angels. Hebrews 1:14 — true angels are ministering spirits sent to serve those who inherit salvation.",
    symptoms: "False angelic encounters; spiritual protection experiences that cannot be verified as Holy Spirit; warrior pride rooted in spirit partnership; dreams of guardian beings who are not of God; sense of spiritual protectors watching over family that are not angels of the Lord",
    companionSpirits: "Familiar Spirits, Counterfeit Holy Spirit, Pride, Witchcraft, Yunwi Tsunsdi",
    assignment: "Providing counterfeit angelic protection to Cherokee descendants; maintaining warrior spirit covenants; operating as high-ranking territorial spirits in underground mountain strongholds",
    source: "Cherokee mythology. Cross-cultural parallel: Watchers/fallen angels (Hebrew — 1 Enoch, Genesis 6), Alfar light elves (Norse), Vanir race (Norse), Demi-gods and Heroes (Greek).",
    wriNotes: "Nunnehi are one of the most sophisticated demonic counterfeits in the Cherokee system — they appear as guardians, warriors, and protectors. People with Cherokee ancestry may have had profound spiritual protection experiences they attribute to Nunnehi rather than God. These are likely high-class fallen Watcher entities in the Appalachian mountains. Renunciation of the Nunnehi specifically is needed for anyone who has had warrior spirit or guardian spirit encounters they cannot verify as Holy Spirit. Do not dismiss these experiences — address the spirit directly.",
  },
  {
    name: "Tlanuwa",
    aka: "Tlanuhwa, The Great Hawk, The Metal Bird, Impenetrable Thunderbird",
    typeRank: "Ruling Spirit",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Pride / Second Heaven",
    strongman: "Pride",
    parentStrongman: "Leviathan",
    description: "Giant predatory birds with impenetrable metal feathers in Cherokee mythology. They nest on high cliff faces and hunt from the air. In Cherokee legend they engage in cosmic conflict with the Uktena (serpent) — representing the ongoing spiritual warfare between atmospheric (second heaven) principalities and aquatic/underworld spirits. They cannot be harmed by conventional weapons due to their metal feathers. Represent spirits that operate in the second heaven — the atmospheric realm — with predatory, swooping attack patterns. The sky-versus-water conflict mirrors the warfare described in Daniel 10.",
    manifestations: "Spiritual attacks that come suddenly from above — swooping, unexpected demonic assault; pride and predatory behavior — hunting and consuming others spiritually; recurring hawk, eagle, or large bird imagery in dreams; demonic assignment from the second heaven over a specific region; attacks that feel airborne rather than earthbound",
    entryPoints: "Shamanic vision quests involving birds or flight; eagle feather ceremonies; ancestral reverence of bird spirits in Cherokee tradition; involvement in the cosmic ceremonial conflict between sky and water spirits",
    legalRights: "Eagle feather ceremonies, bird spirit reverence in shamanic context, ancestral involvement in Cherokee sky spirit worship",
    scripture: "Ephesians 6:12 — rulers of darkness in the heavenly places. Job 39:26-27 — God alone commands the hawk to stretch its wings toward the south. Revelation 18:2 — Babylon as a haunt of every unclean and hated bird.",
    symptoms: "Sudden unexpected spiritual attacks; pride and predatory patterns; hawk or eagle recurring in dreams as demonic symbols; sense of atmospheric spiritual heaviness over a region; attacks from the second heaven that bypass standard ground-level deliverance",
    companionSpirits: "Pride, Leviathan, Second Heaven rulers, Uktena (adversarial — they war with each other)",
    assignment: "Atmospheric principality assignment over Cherokee territory; second heaven warfare; predatory attacks on vulnerable people in the region; maintaining sky-level demonic presence",
    source: "Cherokee mythology — common to many Southeastern tribal traditions. Cross-cultural parallel: Zu Bird (Babylonian), Anzu (Sumerian), Phoenix (Egyptian counterfeit), Garuda (Hindu), Thunderbird (pan-Native American).",
    wriNotes: "The Tlanuwa vs. Uktena cosmic conflict is a picture of second-heaven territorial warfare — similar to Daniel 10 where the Prince of Persia fought the angel for 21 days. These spirits battle each other for regional control. Intercessors doing strategic-level warfare in East Tennessee should be aware both Tlanuwa and Uktena operate in the same airspace. Full armor required. Not typically addressed in individual deliverance but relevant for regional prayer mapping.",
  },
  {
    name: "Kana'ti",
    aka: "Kanati, The Lucky Hunter, The Provider, Cherokee First Man",
    typeRank: "Ruling Spirit",
    rank: "Ruling Spirit",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Pride / False Provider / Fatherhood Wound",
    strongman: "Leviathan",
    parentStrongman: "Leviathan",
    description: "The Cherokee First Man — divine hunter who kept all game animals penned in a cave under his supernatural control, releasing them to his family on demand. When his sons discovered and opened the cave, the animals scattered into the wild. He represents the counterfeit Father/Provider archetype — a spirit of false provision who demands ritual acknowledgment before releasing blessing. Controls masculine identity, generational fatherhood wounds, and provision strongholds. His wife is Selu (Corn Woman) — together they form the false first family of Cherokee theology, a counterfeit Adam and Eve. Commands masculine identity through the lens of being the great hunter and provider.",
    manifestations: "Fatherlessness — father wound patterns running generationally; provision issues tied to ancestral covenants rather than natural poverty; masculine identity confusion or distortion; hunting and the outdoors becoming a spiritual substitute for relationship with God; pride tied to Cherokee warrior or hunter identity; sense that provision must be earned through performance rather than received as gift from God",
    entryPoints: "Masculine identity rooted in Cherokee tradition; hunting rituals with spiritual components; ancestral provider spirit invocations; fatherhood wound patterns in Cherokee family lines; men in family line who served as hunters or warriors in a spiritually significant way",
    legalRights: "Ancestral hunting covenants, provider spirit invocations, masculine identity rooted in Cherokee spiritual tradition rather than God, generational fatherhood wound",
    scripture: "Malachi 4:6 — turning the hearts of fathers to children. Romans 1:25 — worshipped the creature rather than the Creator. Genesis 27 — Esau the hunter who traded his birthright for provision. 1 Timothy 5:8 — providing for family is a God-given call corrupted by this spirit.",
    symptoms: "Father wound — profound sense of abandonment or inadequacy connected to fatherhood; provision anxiety; masculine identity performance; outdoors or hunting as primary spiritual identity; pride in self-sufficiency; inability to receive from God as provider",
    companionSpirits: "Rejection, Fatherlessness, Leviathan, Poverty spirit, False Provider, Nimrod spirit",
    assignment: "Counterfeit Father/Provider over Cherokee bloodlines; maintaining masculine identity rooted in tribal spirit rather than God; reinforcing father wounds across generations",
    source: "Cherokee mythology — Kana'ti and Selu origin stories are foundational Cherokee creation narratives. Cross-cultural parallel: Nimrod the mighty hunter (Biblical), Odin the all-father (Norse), Mixcoatl the hunting god (Aztec), Orion (Greek).",
    wriNotes: "Kana'ti is the counterfeit Father spirit in the Cherokee line. In deliverance ministry with Native American men especially, the Father wound is often the deepest and most defended door — and Kana'ti is the spirit reinforcing it. Address Kana'ti when a Cherokee-ancestry man presents with father wound, provision issues, or masculine identity rooted in heritage rather than God. Always address together with Selu when both maternal and paternal Cherokee lines are involved.",
  },
  {
    name: "Selu",
    aka: "Corn Woman, First Woman, The Blood Mother, Mother of Grain, Cherokee First Woman",
    typeRank: "Ruling Spirit",
    rank: "Ruling Spirit",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Queen of Heaven / Fertility / Witchcraft",
    strongman: "Queen of Heaven",
    parentStrongman: "Jezebel",
    description: "The Cherokee First Woman, wife of Kana'ti, and mother of the first Cherokee people. Produced corn by rubbing her body — a creation-from-body myth with blood covenant overtones. When her sons killed her, corn grew from the ground where her blood fell — a blood covenant origin story for Cherokee agriculture. She is a full Queen of Heaven and fertility goddess archetype. Together with Kana'ti she forms the false first family of Cherokee theology — a counterfeit Adam and Eve — and her specific role is the counterfeit Mother, the feminine creator, and the spirit of provision through blood covenant rather than God's grace.",
    manifestations: "Queen of Heaven patterns — women in family leading spiritually in ways that produce wrong fruit; fertility and womb issues tied to generational Cherokee covenants; food and provision as a spiritual stronghold or idol; matriarchal control connected to provision; blood covenant mentality — the belief that blessing requires sacrifice of self; agricultural land strongholds in Appalachian regions",
    entryPoints: "Green Corn Ceremony participation; agricultural land covenants with Selu specifically; female-led Cherokee ceremonial worship; maternal bloodline with Cherokee spiritual heritage; generational covenant through the mother's family involving food, harvest, or feminine spiritual power",
    legalRights: "Green Corn Ceremony participation, agricultural land covenants, feminine blood covenant, matrilineal Cherokee spiritual heritage, provision idolatry",
    scripture: "Jeremiah 7:18 — women knead dough to make cakes for the Queen of Heaven. Jeremiah 44:17-19 — women burning incense to the Queen of Heaven and attributing provision to her. Acts 19:27 — Diana/Artemis the great goddess whose worship controlled an economy. Revelation 17:5 — Mystery Babylon the Mother.",
    symptoms: "Queen of Heaven patterns in women's spiritual life; fertility issues; food or harvest as a spiritual stronghold; matriarchal control combined with provision control; blood covenant mentality in relationships; womb or reproductive health issues tied to generational Cherokee covenant",
    companionSpirits: "Queen of Heaven, Jezebel, Witchcraft, Kana'ti (always paired), Fertility spirit, Blood Covenant spirit",
    assignment: "Queen of Heaven authority over Cherokee maternal bloodlines; maintaining agricultural land covenants through the female line; controlling provision through blood covenant rather than God's grace",
    source: "Cherokee mythology — Selu is foundational to Cherokee creation narratives and the origin of corn cultivation. Cross-cultural parallel: Queen of Heaven/Asherah (Hebrew), Demeter/Ceres (Greek/Roman), Isis the mother goddess (Egyptian), Pachamama the earth mother (Inca), Frigg/Freya (Norse).",
    wriNotes: "Selu and Kana'ti must always be addressed together when both maternal and paternal Cherokee lines are present in a person's ancestry — they are the complete false-deity couple of this line, a counterfeit first family. Selu feeds the Queen of Heaven pattern which is one of the most overlooked principalities in modern deliverance ministry. In women with Cherokee maternal heritage who present with Queen of Heaven, fertility issues, or matriarchal control, Selu is the specific Cherokee mask that spirit is wearing.",
  },
]

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`

async function airtableFetch(path, method, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function findRecord(name) {
  const encoded = encodeURIComponent(`{${PRIMARY_FIELD}} = "${name.replace(/"/g, '\\"')}"`)
  const res = await fetch(`${BASE_URL}?filterByFormula=${encoded}&maxRecords=1`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  const data = await res.json()
  return data.records?.[0] || null
}

function buildFields(entry) {
  const fields = {}
  for (const [key, airtableField] of Object.entries(FIELD_MAP)) {
    if (entry[key] !== undefined && entry[key] !== null && entry[key] !== '') {
      fields[airtableField] = entry[key]
    }
  }
  return fields
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log(`\n🗡 Cherokee Spirit Line — Airtable Push`)
  console.log(`Using token: ${TOKEN.slice(0, 12)}...`)
  console.log(`Base: ${BASE_ID} | Table: ${TABLE_ID}\n`)

  let created = 0, updated = 0, errors = 0

  for (let i = 0; i < CHEROKEE_ENTRIES.length; i++) {
    const entry = CHEROKEE_ENTRIES[i]
    const idx = `[${i + 1}/${CHEROKEE_ENTRIES.length}]`

    try {
      const existing = await findRecord(entry.name)
      const fields = buildFields(entry)

      if (existing) {
        const res = await airtableFetch(`/${existing.id}`, 'PATCH', { fields })
        if (res.error) {
          console.error(`${idx} ERROR: ${entry.name} — ${res.error?.message || JSON.stringify(res.error)}`)
          errors++
        } else {
          console.log(`${idx} Updated: ${entry.name}`)
          updated++
        }
      } else {
        const res = await airtableFetch('', 'POST', { fields })
        if (res.error) {
          console.error(`${idx} ERROR: ${entry.name} — ${res.error?.message || JSON.stringify(res.error)}`)
          errors++
        } else {
          console.log(`${idx} Created: ${entry.name}`)
          created++
        }
      }
    } catch (err) {
      console.error(`${idx} ERROR: ${entry.name} — ${err.message}`)
      errors++
    }

    if (i < CHEROKEE_ENTRIES.length - 1) await sleep(300)
  }

  // Get final record count
  let totalCount = '?'
  try {
    const countRes = await fetch(`${BASE_URL}?pageSize=1`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    const countData = await countRes.json()
    if (countData.records) totalCount = '(count requires pagination)'
  } catch {}

  console.log(`\n✅ Done`)
  console.log(`   Created: ${created}`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Errors:  ${errors}`)
  console.log(`   Table: ${BASE_URL}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
