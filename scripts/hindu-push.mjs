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

// Single Select fields omitted (kingdom, rank, typeRank, source) — free-text values rejected by Airtable
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

const LABEL = 'HINDU SPIRIT LINE - 16 entries';

const ENTRIES = [
  {
    name: "Trimurti (Corporate)",
    aka: "The Hindu Trinity, Brahma-Vishnu-Shiva as One, AUM the sonic Trimurti",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Leviathan",
    parentStrongman: "Leviathan",
    description: "The three deities functioning as a unified divine entity - Brahman - the Hindu Supreme Reality in three expressions: Brahma the Creator, Vishnu the Preserver, and Shiva the Destroyer. This is the direct counterfeit of the Holy Trinity (Father, Son, Holy Spirit). AUM (Om) is the sonic form of this triad: A equals Brahma (creation), U equals Vishnu (preservation), M equals Shiva (dissolution). Every Om chant invokes all three simultaneously. The governing corporate principality over the entire Hindu spirit system - must be broken as a unit before individual spirits can be fully expelled. Named in Scottish Rite Freemasonry 32nd degree ritual (Pike, Morals and Dogma).",
    manifestations: "AUM/Om chanting as spiritual practice - opens the Trimurti door with every syllable; Freemasonry 32nd degree generational stronghold; yoga as a complete spiritual system engaging all three; comprehensive Hindu ancestral worship; Trimurti meditation; universal consciousness theology (Brahman equals everything) replacing the personal God of Scripture; three-faced deity imagery in art or home",
    entryPoints: "Om/AUM chanting in any context; Freemasonry 32nd degree; yoga as a complete spiritual system; comprehensive Hindu worship including pujas honoring multiple deities; Trimurti meditation; ancestral Hindu practice not specific to one deity; New Age universal consciousness theology rooted in Brahman-Trimurti framework",
    legalRights: "Om/AUM as spiritual practice where every syllable invokes the Trimurti; Freemasonry 32nd degree initiation naming all three; comprehensive Hindu ancestral worship; yoga as total spiritual system; universal consciousness theology replacing the Trinity",
    scripture: "Matthew 28:19 - baptize in the name of the Father and of the Son and of the Holy Spirit - the true Trinity. Deuteronomy 6:4 - the LORD our God, the LORD is one. Isaiah 44:6 - I am the first and I am the last; apart from Me there is no God.",
    symptoms: "Om/AUM in personal practice; Freemasonry bloodline at 32nd degree; comprehensive Hindu background; Trimurti imagery; yoga as total spiritual system; universal consciousness theology replacing the personal God of Scripture",
    companionSpirits: "Brahma, Vishnu, Shiva (must address all three individually after breaking the corporate triad); Ganesha (the gatekeeper under the Trimurti); Kundalini; all Hindu spirits",
    assignment: "Counterfeit Trinity principality over Hindu bloodlines and Freemasonry; governing structure over the entire Hindu spirit system",
    wriNotes: "BREAK THIS FIRST. The Trimurti is the governing corporate spirit. Renunciation prayer: 'I renounce the Hindu Trimurti - Brahma the Creator, Vishnu the Preserver, and Shiva the Destroyer - as a counterfeit of the true Trinity. I break every covenant made through Om chanting, yoga, Freemasonry, Hindu worship, and ancestral practice, in the name of Jesus Christ.' Then address each deity individually. Then Ganesha the gatekeeper, then Kundalini, then the goddesses.",
  },
  {
    name: "Brahma",
    aka: "Brahma the Creator, Svayambhu (self-born), Prajapati, Hiranyagarbha, Vedanatha, Chaturmukha (four-faced). Pronunciation: BRAH-mah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Leviathan",
    parentStrongman: "Leviathan",
    description: "First member of the Hindu Trimurti - the Creator god who spoke and thought the universe into existence. Depicted with four heads facing the four cardinal directions, four arms, seated on a lotus flower. He is the mental power and creative intelligence behind all existence. He is the counterfeit of God the Father - the source, the creator, the mind behind all things. Named in the Scottish Rite Freemasonry 32nd degree ritual as Brahma the Creator (Pike, Morals and Dogma). Associated with the sacred syllable AUM (Om), with the Vedas (sacred texts), and with the first chakra (root/base). In documented deliverance testimony a former yogi revealed that Brahma was the demonic gatekeeper over the root chakra - the primary gateway opened through yoga. Pronunciation: BRAH-mah.",
    manifestations: "Pride of intellect and creative genius - believing oneself to be the source of all creative power; counterfeit God the Father experience; Freemasonry generational stronghold through the 32nd degree; AUM/Om chanting as spiritual practice; mind-led spirituality that bypasses relationship with God; false creative authority; Vasant Panchami and similar festivals honoring Brahma-connected deities in academic or creative contexts",
    entryPoints: "Yoga - Brahma sits over the root chakra, the first spiritual gateway opened through yoga practice; Om/AUM chanting; Freemasonry 32nd degree where Brahma is explicitly named; New Age universalist theology; Hindu ancestral worship; meditation designed to reach cosmic creator consciousness; any practice invoking creative cosmic intelligence apart from God",
    legalRights: "Freemasonry 32nd degree initiation, Om/AUM chanting as spiritual practice, yoga with Hindu devotional intent, ancestral Hindu worship, Brahma invocation in ritual or meditation, meditation designed to reach Brahman cosmic consciousness",
    scripture: "Genesis 1:1 - In the beginning God created. John 1:3 - Through Him all things were made; without Him nothing was made that has been made. Isaiah 42:8 - I am the LORD; that is My name. My glory I will not give to another.",
    symptoms: "Intellectual pride; creator identity rooted outside God; Freemasonry generational stronghold; Om/AUM in personal practice; yoga with Hindu devotional components; mind-led spirituality; four-faced or four-directional imagery in spiritual practice",
    companionSpirits: "Vishnu and Shiva (Trimurti - always address together); Freemasonry spirits; Saraswati (his consort); False Creator",
    assignment: "Counterfeit God the Father over Hindu bloodlines and all connected to the Trimurti; gatekeeper over the root chakra in the yoga initiation system; named in Freemasonry ritual",
    wriNotes: "CHAKRA GATE: Brahma is the documented demonic gatekeeper over the root chakra - the first gateway opened through yoga. In sessions with yoga entry points, address Brahma by name as the first chakra gatekeeper. Named in Freemasonry 32nd degree - address in all sessions with generational lodge membership. The Trimurti (Brahma-Vishnu-Shiva) must ALWAYS be addressed as a unit.",
  },
  {
    name: "Vishnu",
    aka: "Narayana, The Preserver, Hari, Vasudeva, The Blue God, Lord of the Universe, Vaikunthanatha. Pronunciation: VISH-noo",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Leviathan",
    parentStrongman: "Leviathan",
    description: "Second member of the Trimurti - the Preserver god who sustains creation and intervenes in history through ten incarnations (avatars). He is the Hindu counterfeit of Jesus Christ - the divine one who intervenes in history in human form, who preserves and protects, and who defeats cosmic evil. His most famous avatars are Krishna and Rama. Named in Freemasonry 32nd degree as Vishnu the Preserver. His wife Lakshmi is the prosperity goddess - Lakshmi is depicted wearing a nose ring in virtually every traditional idol and painting, and the right nostril nose ring is the Lakshmi-Vishnu prosperity covenant. Varalakshmi Vratam is the primary Lakshmi worship festival specifically connected to Vishnu through his consort. Pronunciation: VISH-noo.",
    manifestations: "Counterfeit Christ experiences - encounters with a blue or dark being presenting as divine; avatar theology (many incarnations of God rather than one unique Incarnation); preservation and control spirit - compulsive need to sustain and maintain things; prosperity gospel rooted in Lakshmi-Vishnu covenant; Hare Krishna background; right nostril nose ring as Lakshmi-Vishnu covenant",
    entryPoints: "Freemasonry 32nd degree; Hindu devotional practice directed at Vishnu or Krishna; Hare Krishna movement (ISKCON); avatar theology in New Age systems; Vaishnavism (the Hindu sect devoted to Vishnu); yoga with Vishnu-devotional intent; right nostril nose ring as Lakshmi covenant (Vishnu's consort); Varalakshmi Vratam observance (Lakshmi puja specifically for Vishnu's consort's blessings)",
    legalRights: "Freemasonry 32nd degree, Vishnu/Krishna bhakti devotion, ISKCON initiation, avatar theology replacing the unique Incarnation of Christ, right nostril nose ring as Lakshmi-Vishnu prosperity covenant, ancestral Hindu worship directed at Vishnu, Varalakshmi Vratam participation",
    scripture: "John 1:14 - The Word became flesh and dwelt among us - one unique Incarnation, not many avatars. Acts 4:12 - there is salvation in no one else. Hebrews 9:28 - Christ was sacrificed once to take away the sins of many - once, not cyclically reincarnating.",
    symptoms: "Counterfeit Christ encounter; blue deity in dreams; ISKCON background; avatar theology; preservation and control spirit; prosperity rooted in Hindu covenant; right nostril nose ring; Vaishnavism in family background; Freemasonry stronghold",
    companionSpirits: "Counterfeit Christ, Pride, Brahma and Shiva (Trimurti), Lakshmi (his consort), Krishna and Rama (his avatars), Freemasonry spirits",
    assignment: "Counterfeit Christ and Preserver over Hindu bloodlines; providing false incarnation theology; avatar deception across generations; named in Freemasonry; operating through Lakshmi nose ring covenant over women",
    wriNotes: "Vishnu is the counterfeit Christ. NOSE RING - RIGHT NOSTRIL: Connected to Lakshmi (Vishnu's consort). Lakshmi is depicted with a nose ring in traditional Hindu idol art. Apply the same deaf-and-dumb binding protocol as Parvati left nostril covenant. Bind Deaf and Dumb first, then command Lakshmi by name, then have the person renounce the covenant verbally. See Parvati and Lakshmi entries for full protocols.",
  },
  {
    name: "Shiva",
    aka: "Siva, Mahesh, Mahadeva, Nataraja (Lord of Dance), Bholenath, Rudra, Shankar, Pashupati, Vaidyanath, Yogeshwara, Mahakala. Pronunciation: SHEE-vah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Death",
    parentStrongman: "Death",
    description: "Third and most widely worshipped member of the Trimurti - the Destroyer god who dissolves the universe at the end of each cosmic cycle. Associated with cremation grounds, ashes, skulls, serpents, the third eye that burns to ash, and the Lingam (phallic worship symbol). He is the patron god of yoga and the father of all yogic practice - every yoga asana and breathwork practice at its foundation is devotion to Shiva. He is the counterfeit Holy Spirit - the one who fills, transforms, destroys the old, and gives mystical experience. Named in Scottish Rite Freemasonry 32nd degree as Shiva the Destroyer. His wife is Parvati. Parvati, Lakshmi, and Saraswati are all explicitly depicted in Hindu scripture and traditional art with nose rings as the divine standard of feminine adornment - meaning the nose ring covenant runs through Shiva's family (Parvati) and Vishnu's family (Lakshmi). Pronunciation: SHEE-vah.",
    manifestations: "Sudden destruction in all areas of life simultaneously; kundalini-type manifestations (tremors, heat, spine sensations, serpent energy) during or after yoga or meditation; yoga as a spiritual identity rather than just exercise; Om Namah Shivaya mantra in personal practice; third eye focus in meditation; Shiva tattoos including Trishula trident, third eye, Om symbol; skull and ash symbolism; destruction followed by emptiness rather than genuine renewal; nose ring tied to Parvati; infirmity spirits - specifically diabetes, cancer cell activity, and heart disease - documented companions to the Parvati nose ring covenant",
    entryPoints: "Yoga practice in any form - Shiva is the patron god of yoga; Shivaratri festival worship; Shiva Lingam worship; Om Namah Shivaya mantra (directly invokes Shiva); Kundalini awakening practices; Shaivism (the Hindu sect devoted to Shiva as Supreme); Scottish Rite Freemasonry 32nd degree; nose ring as Parvati covenant (Parvati is Shiva's wife and the source of the left nostril nose ring covenant); Shiva tattoos; Shiva idol in home",
    legalRights: "Yoga practice (Shiva is the patron yogi - all yoga opens to Shiva), Om Namah Shivaya mantra, Shivaratri worship, Shiva Lingam veneration, Kundalini awakening directed at Shiva, Freemasonry 32nd degree, ancestral Shaivite worship, left nostril nose ring as Parvati-Shiva covenant, Shiva tattoos as body covenant",
    scripture: "Revelation 9:11 - the angel of the Abyss whose name is Abaddon (Destroyer). John 10:10 - the thief comes only to steal, kill, and destroy. 1 Corinthians 3:16-17 - you are God's temple; if anyone destroys God's temple, God will destroy him.",
    symptoms: "Sudden destruction; kundalini manifestations; yoga as spiritual practice; Om Namah Shivaya in practice; third eye meditation; Shiva tattoos; skull and ash symbolism; destruction without renewal; left nostril nose ring; infirmity - diabetes, cancer cells, heart disease",
    companionSpirits: "Death, Destruction, Kundalini serpent, Counterfeit Holy Spirit, Parvati (his wife - always paired), Kali (his dark consort), Brahma and Vishnu (Trimurti), Infirmity, Deaf and Dumb spirit (companion to Parvati covenant)",
    assignment: "Destruction principality over Hindu bloodlines; counterfeit Holy Spirit through yoga and Kundalini awakening; patron of all yoga practice; opening the third eye gateway through meditation; operating through Parvati nose ring covenant with infirmity companions",
    wriNotes: "CRITICAL NOSE RING PROTOCOL - FULL PROCEDURE: (1) BIND DEAF AND DUMB FIRST - command: Spirit of Deaf and Dumb, I bind you in the name of Jesus Christ. You will not prevent this spirit from manifesting. (2) Command Parvati by name to release the person. (3) Person verbally renounces: I renounce every covenant with Parvati and Shiva made through this nose piercing, in the name of Jesus Christ. (4) Command Parvati out. (5) Address companion infirmity: Spirit of Infirmity including every spirit of diabetes, cancer, and heart disease that entered through this covenant - come out now in Jesus name. (6) Declare healing. YOGA: Shiva is the patron god of yoga. Yoga must be completely renounced - not modified - renounced entirely.",
  },
  {
    name: "Kali",
    aka: "Kalika, The Black One, Mahakali, Bhadrakali, Chamunda, Mother of Skeletons, Dark Mother. Pronunciation: KAH-lee",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Death",
    parentStrongman: "Death",
    description: "The most terrifying goddess in the Hindu pantheon - the dark mother, the destroyer of ego, the consumer of time itself. Depicted with garland of severed human heads, skirt of severed human arms, tongue extended, sword in hand. Emerged from the forehead of Durga in battle rage and nearly destroyed the entire world. First of the Ten Mahavidyas - ten tantric goddess-aspects representing total cosmic power. Animal sacrifice continues daily at Kalighat Temple, Kolkata, where thousands of devotees attend. Kali puja is a major festival observed in Bengal and throughout the Hindu world. She is the Hindu Leviathan from the feminine side - a chaos-death-destruction principality of the highest order. Pronunciation: KAH-lee.",
    manifestations: "Sudden and complete destruction across all areas of life at once; bloodlust and murderous rage beyond natural emotion; dark mother attachment - destroys what she claims to protect; Tantric occult practice; blood ritual in family line; skull and death imagery with spiritual draw; consuming time - nothing lasts; wild-eyed uncontrollable rage manifesting during deliverance that seems beyond the person",
    entryPoints: "Kali worship and puja; Kalighat Temple visitation or any Kali temple with devotional intent; Kali Puja festival participation (major festival in Bengal and Hindu diaspora); Tantra and Tantric sex magic where Kali is the patron goddess; blood sacrifice in Hindu context; Bengali or South Asian ancestral Kali devotion; Durga Puja where Kali is invoked as an aspect; dark goddess circles in New Age or neo-pagan contexts; Kali tattoos",
    legalRights: "Kali puja and worship, blood covenant through animal sacrifice, Tantric initiation with Kali as patron, Kali Puja festival participation, Kali temple dedication including Kalighat visitation, dark goddess covenant, ancestral Bengali Kali devotion, Kalighat Temple daily sacrifice covenant",
    scripture: "Isaiah 27:1 - the LORD will punish Leviathan the twisted serpent and slay the dragon. Revelation 17:6 - the woman drunk with the blood of the saints. Isaiah 49:24-25 - can the prey be taken from the mighty? Yes - God rescues from the powerful.",
    symptoms: "Murderous rage; sudden total destruction; dark mother spiritual attachment; blood obsession; skull and death symbolism; Tantric practice in family; wild rage during deliverance that seems beyond the person",
    companionSpirits: "Death, Murder, Destruction, Chaos, Rage, Shiva (her consort), Durga (her source), Witchcraft, Blood covenant spirits, Tantric spirits",
    assignment: "Death and total destruction principality over Hindu bloodlines; operating through blood sacrifice covenant; first of Ten Mahavidyas - supreme occult power from the feminine side; maintaining Tantric power systems",
    wriNotes: "Kali is the most ferocious spirit in the Hindu line - treat as a principality-level death spirit equivalent to Leviathan. Expect violent manifestation. BIND FIRST before any other command. Tantric connection means sexual perversion AND blood covenant may both be present as legal grounds. She also manifests as a consuming dark-mother spirit who destroys everything around the person in the name of protection.",
  },
  {
    name: "Parvati",
    aka: "Uma, Gauri, Shakti, Ambika, Bhavani, Annapurna, Haimavati, Goddess of Marriage. Pronunciation: PAR-vah-tee",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Queen of Heaven",
    parentStrongman: "Jezebel",
    description: "The goddess of love, marriage, fertility, and devotion - the wife of Shiva and mother of Ganesha. She is depicted in traditional Hindu temple art, festival idols, and ancient sculpture consistently wearing a nose ring. The Shiva Purana and Devi Bhagavata Purana describe her adorned with the full Solah Shringar (16 sacred adornments), of which the nose ring (Nath or Mookuthi) is one. Parvati, Lakshmi, and Saraswati are all explicitly depicted in scripture and art with nose rings as the divine standard of feminine adornment. The Sushruta Samhita (ancient Ayurvedic text, Chikitsa Sthana Chapter 19) codified the left nostril piercing as connected to the female reproductive system and the Ida Nadi (lunar energy channel), giving the covenant medical cover. LEFT nostril equals Parvati covenant. When a Hindu woman pierces the left nostril she is making herself look like Parvati, modeling divine feminine identity on the goddess, and inviting her presence - whether this is consciously intended or not. Teej festival is dedicated specifically to Parvati by married women who fast for their husbands and pray to Parvati for their wellbeing. The spirit operating through this covenant is characteristically DEAF AND DUMB. Documented companion infirmities: diabetes, cancer cell activity, heart disease. Pronunciation: PAR-vah-tee.",
    manifestations: "Queen of Heaven patterns in women; marriage and fertility idolatry - placing the marriage covenant above God; left nostril nose ring as an active spiritual covenant with Parvati; infirmity specifically diabetes, cancer cell activity, and heart disease in women with this covenant; a deaf and dumb accompanying spirit resisting identification; reproductive health issues tied to the Parvati covenant; the Solah Shringar (16 Hindu bridal adornments) as a spiritual identity framework replacing biblical identity in women",
    entryPoints: "Hindu wedding ceremony performing the Solah Shringar (16 adornments dedicated to Parvati); left nostril nose ring piercing with any Indian cultural or spiritual context; Shivaratri festival worship (Parvati worshipped alongside Shiva); Teej festival (dedicated specifically to Parvati by married women who fast for their husbands); Hartalika Teej (women fast without water for Parvati); Gauri Puja performed before Hindu weddings; ancestral Shaivite devotion; prayer to Parvati for marriage or fertility; viewing or venerating any idol or image of Parvati as a devotional act",
    legalRights: "Left nostril nose ring as active Parvati body covenant; Solah Shringar performed in Hindu wedding ceremony; Teej festival fasting and prayer to Parvati; Hartalika Teej without-water fast for Parvati; Gauri Puja before marriage; Parvati puja in home; ancestral Shaivite devotion through female line; any prayer directed to Parvati for marital blessing or fertility",
    scripture: "1 Corinthians 6:19-20 - your body is a temple of the Holy Spirit. Jeremiah 7:18 - women knead cakes for the Queen of Heaven. Ephesians 5:25-27 - the marriage covenant belongs to Christ and the Church alone.",
    symptoms: "Queen of Heaven patterns; left nostril nose ring with Indian heritage; infirmity - diabetes, cancer cells, heart disease; reproductive health issues; marriage as idol above God; deaf and dumb spirit blocking deliverance; Solah Shringar as spiritual identity framework; Teej or Hartalika Teej in family history",
    companionSpirits: "Queen of Heaven, Jezebel, Shiva (husband - always paired), Deaf and Dumb spirit (companion to nose ring covenant), Spirit of Infirmity, Diabetes, Cancer, Heart Disease (documented infirmity companions), Kali (her dark aspect)",
    assignment: "Queen of Heaven authority over Hindu women through the nose ring covenant; marriage and fertility idolatry; operating with deaf and dumb companion spirit to prevent detection; releasing infirmity through the body covenant of the piercing",
    wriNotes: "NOSE RING PROTOCOL - LEFT NOSTRIL: (1) Bind Deaf and Dumb FIRST. (2) Command Parvati by name to release the person. (3) Person renounces verbally: I renounce every spiritual covenant with Parvati made through this nose piercing, in the name of Jesus Christ. (4) Command Parvati out. (5) Address companion infirmity - diabetes, cancer cell activity, heart disease. (6) Declare healing. IMPORTANT: The nose ring is a devotional act whether consciously intended or not. Any woman with Indian heritage and a left nostril piercing should have this assessed in ministry context.",
  },
  {
    name: "Durga",
    aka: "Devi, Shakti, Chandika, Chamunda, Mahishasuramardini, Sherawali, Amba. Pronunciation: DUR-gah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Queen of Heaven",
    parentStrongman: "Jezebel",
    description: "The most splendid warrior goddess - described as containing the power of all the gods combined. Created when the gods pooled their divine energy to defeat a demon only a woman could destroy. Rides a lion or tiger, bears multiple weapon-holding arms. All other goddesses - Lakshmi, Saraswati, and Kali - emerged from her body. She is the unified feminine spiritual authority over all Hindu bloodlines. Worshipped in the massive Durga Puja festival (especially in Bengal and West India) and in Navratri (nine nights of escalating goddess worship). Durga Puja involves elaborate multi-day festivals with clay idol processions, puja ceremonies at household altars and public pandals, and culminates in immersion of the idol in water (visarjan) - releasing the goddess back into the divine realm after receiving her presence.",
    manifestations: "Warrior-queen spirit in women - spiritually gifted women operating with ferocious ungodly authority; lion and tiger predatory imagery; divine feminine warrior identity in New Age context; Durga Puja or Navratri in family history; Shakti energy invocation; predatory ferocity in women's spiritual gifts",
    entryPoints: "Durga Puja festival participation including household pandal worship and idol immersion ceremony; Navratri (nine nights of escalating goddess worship - each night devotion increases in intensity, making the full observance a nine-day altar covenant); Durga puja in home; South Asian ancestral tradition; New Age divine warrior-feminine practices; Shakta Hindu sect devotion; Tantric practices involving Durga; Shakti energy invocation in any context",
    legalRights: "Durga puja, Navratri festival participation with devotional intent (each of the nine nights escalates the covenant), ancestral Shakta devotion, Shakti energy invocation, Tantric Durga initiation, household Durga puja including pandal worship, warrior-goddess covenant in family line",
    scripture: "Ephesians 6:10 - be strong in the Lord and in His mighty power - divine strength from God alone, not goddess-power. 2 Corinthians 10:4 - the weapons of our warfare are not of the flesh but divinely powerful. Judges 4-5 - Deborah is the biblical warrior-woman, empowered by God alone.",
    symptoms: "Ferocious spiritual gifting producing wrong fruit; warrior-queen spirit in women; lion or tiger predatory imagery; Durga Puja in family; Navratri observance; Shakti energy invocation; divine-feminine warrior identity",
    companionSpirits: "Queen of Heaven, Jezebel, Kali (Durga's dark emanation), Parvati (her gentle form), Shakti, Witchcraft, Pride, Warrior spirit (counterfeit)",
    assignment: "Warrior-queen principality of the Hindu feminine line; containing within her all aspects of the goddess system; operating through Durga Puja and Navratri covenant; unified feminine spiritual authority over Hindu bloodlines",
    wriNotes: "Durga contains all the Hindu goddesses within her - address Durga as the overarching feminine principality, then her specific aspects (Kali, Parvati, Lakshmi, Saraswati) individually. NAVRATRI NOTE: Navratri is nine days of escalating goddess worship - each successive night the devotion intensifies. If a person or their family has observed all nine nights, the covenant deepens with each night. Renounce each night specifically or renounce the full nine-night covenant as a unit.",
  },
  {
    name: "Lakshmi",
    aka: "Laxmi, Sri, Padma, Kamala, Goddess of Wealth, Vishnu's Consort. Pronunciation: LAHK-shmee",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Mammon",
    parentStrongman: "Jezebel",
    description: "The goddess of wealth, fortune, prosperity, beauty, luxury, and fertility - Vishnu's consort. Lakshmi is explicitly depicted with a nose ring in virtually every traditional Hindu idol, painting, and festival representation including those used during Varalakshmi Vratam and Diwali. Ancient Vedic references describe the goddess of wealth adorned with nose rings. The Skanda Purana records that Lakshmi herself revealed the merits of the Varalakshmi Vratam to Parvati. The Varalakshmi Vratam is a major vrat observed by South Indian Hindu women - primarily in Andhra Pradesh, Tamil Nadu, Karnataka, Maharashtra, and Odisha - on the Friday before the full moon in the Tamil month of Aadi (July-August). Women perform elaborate puja to Lakshmi for wealth, health, and the wellbeing and longevity of their husbands, and this vrat is explicitly passed from mother to daughter across generations making it a matrilineal covenant transmission. Diwali (Festival of Lights) is the largest Hindu festival globally and its Lakshmi puja is the central act. The RIGHT nostril nose ring is the Lakshmi-Vishnu prosperity covenant. Every Hindu home typically has a Lakshmi idol functioning as a household god. She is Mammon wearing a Queen of Heaven face. Pronunciation: LAHK-shmee.",
    manifestations: "Wealth as spiritual identity; Diwali as family festival observed devotionally; Lakshmi image in home as active household god; right nostril nose ring as prosperity covenant; Indian business with Lakshmi dedication; prosperity idolatry - provision dependent on Lakshmi covenant; lotus and elephant as spiritual symbols in home decor; Varalakshmi Vratam in family history",
    entryPoints: "Diwali festival Lakshmi puja (largest Hindu festival globally - millions observe this including those who do not identify as practicing Hindus); Varalakshmi Vratam - the South Indian vrat dedicated to Lakshmi for prosperity and marital blessing, passed from mother to daughter through generations; Lakshmi puja on any Thursday in Margashirsha month (dedicated to Vishnu-Lakshmi); Lakshmi idol in household as a prosperity household god; right nostril nose ring as Lakshmi-Vishnu covenant (right nostril equals Pingala Nadi equals solar energy equals prosperity channel in Ayurveda); Indian business dedication to Lakshmi; Vaishnavism devotion",
    legalRights: "Diwali Lakshmi puja with devotional intent; Varalakshmi Vratam participation or family observance (passed from mother to daughter - generational covenant transmission); Margashirsha Thursday Lakshmi puja; household Lakshmi idol present in the home (active household god legal ground); right nostril nose ring as Lakshmi prosperity covenant; Indian business dedication to Lakshmi; Vishnu-Lakshmi bhakti devotion",
    scripture: "Matthew 6:24 - you cannot serve God and Mammon. Deuteronomy 8:18 - the LORD gives ability to produce wealth. Luke 12:15 - life does not consist in abundance of possessions.",
    symptoms: "Wealth as spiritual identity; Diwali devotionally observed; Lakshmi image in home; right nostril nose ring; Indian business with Lakshmi dedication; prosperity idolatry; lotus and elephant decor as spiritual covenant objects; Varalakshmi Vratam in family",
    companionSpirits: "Mammon, Queen of Heaven, Vishnu (her husband), Diwali spirits, Prosperity idolatry, Household gods, Deaf and Dumb spirit (right nostril nose ring - same protocol as Parvati left nostril)",
    assignment: "Mammon and prosperity idolatry over Hindu bloodlines; household god authority through Lakshmi images; Diwali covenant; right nostril nose ring covenant tied to Vishnu-Lakshmi prosperity system; matrilineal covenant transmission through Varalakshmi Vratam from mother to daughter",
    wriNotes: "LAKSHMI IDOL IN THE HOME IS AN ACTIVE HOUSEHOLD GOD. It must be removed from the premises - not just prayed over. VARALAKSHMI VRATAM: This is a widely overlooked but significant entry point. The Skanda Purana documents Lakshmi herself revealing this vrat to Parvati, creating a direct scriptural link between the two goddesses' covenants. Any woman in the family who has observed Varalakshmi Vratam has opened a Lakshmi altar that was passed to her daughters. RIGHT NOSTRIL nose ring equals Lakshmi prosperity covenant. Apply the full deaf-and-dumb binding protocol: bind Deaf and Dumb first, command Lakshmi by name, person renounces the covenant specifically, then address companion infirmity spirits. Note that Lakshmi is depicted with a nose ring in traditional art and idols - this makes the right nostril ring a direct devotional act to Lakshmi whether or not the person understands this.",
  },
  {
    name: "Saraswati",
    aka: "Sharada, Vagdevi (Goddess of Speech), Vina-Pustak-Dharini, Goddess of Knowledge and Arts. Pronunciation: SAR-as-wah-tee",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Witchcraft",
    parentStrongman: "Witchcraft",
    description: "The goddess of knowledge, wisdom, learning, music, arts, and speech - the wife of Brahma. She is the Hindu counterfeit of the Holy Spirit's function as teacher and giver of wisdom (John 14:26). Depicted in white, holding a veena (string instrument), a book, and a rosary. Students and artists invoke her before examinations, performances, and creative work. Saraswati, like Parvati and Lakshmi, is depicted in traditional Hindu art and sculpture wearing a nose ring. Worshipped in Vasant Panchami (Spring Fifth) festival. Her worship is deeply embedded in Indian academic and artistic culture - one of the most common entry points for people who do not consider themselves religiously Hindu, as Saraswati puja before exams is a cultural tradition in many Indian families. Pronunciation: SAR-as-wah-tee.",
    manifestations: "Intellectual and artistic identity rooted in goddess devotion; invocation of Saraswati before creative or academic work; Vasant Panchami observance; white and lotus imagery in artistic spiritual context; false wisdom - knowledge that produces pride and separation from God rather than humility; speech or writing that feels controlled by an outside spiritual force",
    entryPoints: "Vasant Panchami worship; Saraswati puja before exams or performances; Indian academic or artistic family with Saraswati devotion; invocation of Saraswati in any creative context; ancestral Brahma-Saraswati worship; any ritual offering before creative work directed to Saraswati including student pen and book blessings",
    legalRights: "Saraswati puja, Vasant Panchami devotion, invoking Saraswati for academic or creative success, ancestral Hindu academic devotion through Saraswati, pen and book blessing ritual offerings to Saraswati",
    scripture: "James 1:5 - if any of you lacks wisdom, let him ask God who gives generously. Colossians 2:3 - in Christ are hidden all the treasures of wisdom and knowledge. 1 Corinthians 2:12-13 - we have received the Spirit who is from God, that we might understand what God has freely given.",
    symptoms: "Creative or intellectual identity rooted in goddess; Vasant Panchami in family; false wisdom separating from God; invocation of spiritual help for creative work from sources other than the Holy Spirit; white swan or veena imagery in spiritual art",
    companionSpirits: "Witchcraft, False Wisdom, Python, Brahma (her husband), Arts spirits, Academic pride",
    assignment: "False wisdom and artistic gifting over Hindu bloodlines; counterfeit Holy Spirit as teacher and giver of creative ability; Vasant Panchami covenant",
    wriNotes: "Saraswati is a common entry point in academically accomplished Indian families where explicit Hindu worship has largely been abandoned but Saraswati puja for exams was still practiced. Address when a person has Indian heritage and strong intellectual or artistic identity that feels spiritually rooted in ways that resist the Holy Spirit. Note that Saraswati is also depicted with a nose ring in traditional art - though the nose ring covenant specifically runs through Parvati (left nostril) and Lakshmi (right nostril), Saraswati's depiction confirms that nose ring wearing by Hindu women is meant to make them look like and invite all three major goddesses.",
  },
  {
    name: "Ganesha",
    aka: "Ganesh, Ganapati, Vinayaka, Vighneshvara (Remover of Obstacles), Elephant God. Pronunciation: GAH-nay-shah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Witchcraft",
    parentStrongman: "Witchcraft",
    description: "The elephant-headed son of Shiva and Parvati - the remover of obstacles and lord of beginnings. He is invoked at the start of every single Hindu ritual, ceremony, or new venture without exception. He is the gatekeeper - no other spirit or deity is approached in Hinduism without first honoring Ganesha. He is the most globally distributed Hindu deity, with his image appearing in yoga studios, restaurants, home decor, gift shops, and New Age stores worldwide, usually framed as good luck or obstacle-removal without any explicitly religious framing. Ganesh Chaturthi is a major 10-day public festival celebrating Ganesha, widely observed especially in Maharashtra. This global cultural saturation makes him the single most common entry point for the Hindu spirit line among non-Hindu Westerners. As the gatekeeper, addressing Ganesha first closes the primary door through which all other Hindu spirits operate. Pronunciation: GAH-nay-shah.",
    manifestations: "Ganesha statues or images in home, business, or yoga studio functioning as household gods even when perceived as purely decorative; yoga practice environments where Ganesha is displayed or invoked; obstacles in prayer and spiritual life that feel maintained by an outside force; breakthrough consistently blocked despite clear effort; obstacle-removal prayers directed outside of God",
    entryPoints: "Ganesha statue or image in home or workspace (the image is the covenant regardless of intent); yoga studio with Ganesha imagery (the image transfers the covenant to anyone practicing there); gift of a Ganesha statue (extremely common as a wellness or housewarming gift); deliberate Ganesha worship for obstacle-removal; Ganesh Chaturthi festival participation (10-day public festival with daily puja escalating to immersion); Hindu ceremonial participation beginning with Ganesha invocation",
    legalRights: "Ganesha image in home or workplace (household god covenant regardless of religious intent), yoga studio with Ganesha imagery present during practice, deliberate Ganesha puja, gift-received Ganesha statues kept in home, Ganesh Chaturthi participation, ceremonial Hindu participation beginning with Ganesha invocation",
    scripture: "Judges 6:25-26 - tear down your father's altar and cut down the Asherah pole - idols in the home must be removed. Acts 19:19 - those who had practiced sorcery brought their scrolls and burned them. Zechariah 10:2 - idols speak lies.",
    symptoms: "Ganesha image in home or possession; yoga environment with Ganesha presence; obstacle-maintaining spirit - breakthroughs consistently blocked; luck and obstacle-removal prayers directed outside God; elephant imagery with spiritual significance",
    companionSpirits: "Witchcraft, Shiva (his father), Parvati (his mother), Household gods, ALL Hindu spirits (Ganesha guards every other Hindu spirit - address him first)",
    assignment: "Gatekeeper over the entire Hindu spirit system - guards every other Hindu spirit and must be addressed first; operating through the global spread of his image into non-Hindu Western culture",
    wriNotes: "ADDRESS GANESHA FIRST in all Hindu spirit line deliverance - before Brahma, Vishnu, or Shiva. He guards the door. PRACTICAL: Ganesha statues are among the most commonly owned spiritual objects in Western homes today. ALWAYS ask in assessment: 'Do you own any Ganesha statues or images? Were they gifts?' All Ganesha objects must be removed from the home - this is an active household god, not a cultural ornament. This applies to mass-produced decorative items purchased at retail stores as much as traditional religious objects.",
  },
  {
    name: "Kundalini",
    aka: "Kundalini Shakti, The Coiled Serpent, Serpent Fire, Serpent Power, The Sleeping Serpent. Pronunciation: koon-dah-LEE-nee",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Python / Kundalini",
    parentStrongman: "Leviathan",
    description: "The serpent spirit described in Hindu and Tantric theology as a coiled serpent lying dormant at the base of the spine in the root chakra. The word kundalini means coiled one, from kund meaning a deep pit and lini meaning energy. Yoga, meditation, breathwork (pranayama), and mantras are designed to awaken this serpent so it rises through the seven chakras of the spine until it reaches the crown of the head. Physical manifestations of kundalini awakening include involuntary body movements, tremors, spinal heat or electrical sensations, spontaneous visions, out-of-body experiences, and uncontrollable emotional episodes. These are indistinguishable in outward appearance from the physical manifestations of the Holy Spirit in some charismatic contexts - making this the most dangerous counterfeit Holy Spirit in operation today. Deliverance testimonies document that the kundalini spirit manifests during expulsion as a serpent face on the person. Pronunciation: koon-dah-LEE-nee.",
    manifestations: "Tremors, involuntary body movements, and spinal heat or electrical current during or after yoga or meditation; serpent-like manifestations during deliverance including snake imagery, writhing, or serpent face; counterfeit revival manifestations in charismatic environments where kundalini entered through New Age crossover; spontaneous visions and out-of-body experiences; sexual arousal during meditation (the kundalini-sexuality connection in Tantra); third eye opening with demonic visual experiences",
    entryPoints: "Any yoga practice - kundalini yoga most directly but all yoga opens the kundalini pathway because Shiva (the patron of yoga) is the source of kundalini energy; kundalini meditation and breathwork; Tantric practice; mantra chanting including Om Namah Shivaya, Om, and Hare Krishna which are all designed to awaken kundalini; meditation that deliberately empties the mind; any Hindu spiritual practice designed to raise spiritual energy through the spine; charismatic Christian environments where kundalini manifestations are mistaken for the Holy Spirit and received as such",
    legalRights: "Yoga practice, kundalini meditation, Tantric initiation, mantra chanting, any practice designed to awaken the serpent energy through the spine, participation in environments where kundalini was being operated and transferred to others, receiving kundalini through touch or proximity from a guru or teacher",
    scripture: "Acts 16:16-18 - Paul cast out the spirit of Python (divination / serpent spirit) from the slave girl - this is the biblical deliverance protocol for kundalini. Genesis 3:1 - the serpent was more crafty than any other beast. Numbers 21:8-9 pointing to John 3:14-15 - God's reversal of serpent power through Christ.",
    symptoms: "Tremors and involuntary movement in spiritual context; spinal heat or electricity; yoga background; third eye experiences; out-of-body experiences; sexual arousal during meditation; counterfeit Holy Spirit manifestations; snake face during deliverance",
    companionSpirits: "Python, Serpent spirits, Witchcraft, Counterfeit Holy Spirit, Shiva (kundalini is his energy), Tantra spirits, Leviathan",
    assignment: "Counterfeit Holy Spirit operating through the spinal column; demonic takeover through the chakra gateway system from the base of the spine to the crown; transferring through yoga and meditation environments; creating counterfeit revival manifestations in charismatic settings",
    wriNotes: "Kundalini IS the Python spirit - Acts 16:16-18 is the protocol. Paul did not argue, negotiate, or counsel it - he commanded it out in the name of Jesus Christ. Command: Kundalini serpent spirit, Python, I command you to come out in the name of Jesus Christ. The manifestation may be dramatic including serpent-like writhing, snake sounds, or a literally serpent-appearing face on the person. This is documented in multiple ministry testimonies. Do not be moved by the manifestation. YOGA MUST BE FULLY RENOUNCED - not modified, not replaced with Christian yoga - renounced entirely. The entire yoga system is designed to awaken this serpent and there is no spiritually safe version.",
  },
  {
    name: "Krishna",
    aka: "Govinda, Gopala, Murari, Hari, Vasudeva, Devaki-nandana, Shyam. Pronunciation: KRISH-nah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Counterfeit Christ",
    parentStrongman: "Leviathan",
    description: "The eighth and most celebrated avatar of Vishnu - widely regarded as the supreme deity in his own right by Vaishnava tradition. Speaker of the Bhagavad Gita. He is depicted as blue-skinned, playing a flute, surrounded by adoring cow-maidens (Gopis) with whom he engages in divine romantic play (Rasa Lila). He is the most theologically sophisticated counterfeit Christ in the Hindu line. The Hare Krishna movement (ISKCON, founded 1966 by A.C. Bhaktivedanta Swami Prabhupada) is an active Western missionary organization devoted to Krishna with temples in most major cities. Janmashtami is the major festival celebrating Krishna's birth, widely observed by Hindu diaspora. Pronunciation: KRISH-nah.",
    manifestations: "ISKCON background; Bhagavad Gita studied as spiritual authority equal to or above Scripture; counterfeit devotional experience directed at Krishna; blue deity in visions or dreams; spiritual-sexuality confusion - mixing divine love with sexual expression through the Rasa Lila theology; flute music with spiritual draw; avatar theology; Janmashtami festival participation",
    entryPoints: "Hare Krishna chanting - every repetition of the Hare Krishna mantra directly invokes Krishna as the Supreme Person; ISKCON membership or attendance; Bhagavad Gita as supreme spiritual authority replacing Scripture; Krishna puja; bhakti yoga directed at Krishna; Janmashtami festival participation; Vrindavan pilgrimage with devotional intent",
    legalRights: "Hare Krishna mantra chanting (every repetition renews the covenant), ISKCON initiation, Bhagavad Gita as supreme spiritual authority, Krishna puja, bhakti yoga directed at Krishna, Janmashtami festival devotion",
    scripture: "John 14:6 - I am the way, the truth, and the life. No one comes to the Father except through Me. Acts 4:12 - there is no other name under heaven given to mankind by which we must be saved. 2 Corinthians 11:4 - if someone comes preaching another Jesus, you put up with it.",
    symptoms: "ISKCON background; Hare Krishna chanting; Bhagavad Gita as authority; counterfeit devotional experience; blue figure in dreams; spiritual-sexuality confusion; flute music with spiritual draw; avatar theology",
    companionSpirits: "Counterfeit Christ, Vishnu (Krishna is his avatar), Lust (Rasa Lila), Bhakti spirits, Deception, ISKCON spirits, Spiritual sexuality",
    assignment: "Most sophisticated counterfeit Christ in the Hindu line; operating through ISKCON and Bhagavad Gita as Western missionary vehicles; Rasa Lila spirit producing spiritual-sexuality confusion",
    wriNotes: "Krishna is the most theologically dangerous counterfeit in this line because his teaching in the Bhagavad Gita includes concepts of surrender, devotion, and divine love that can feel identical to Christian experience. In ISKCON sessions, address Krishna specifically as the counterfeit Christ and call the person to renounce all allegiance to him. The Hare Krishna mantra is a direct covenant - every repetition strengthens it. Have the person renounce the mantra and every time they have chanted it.",
  },
  {
    name: "Indra",
    aka: "Sakra, Lord of the Gods, Vajrapani, King of Heaven, Storm God. Pronunciation: IN-drah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Leviathan",
    parentStrongman: "Leviathan",
    description: "The king of the gods in Vedic (oldest) Hindu tradition - the storm god, war god, and lord of Svarga (heaven). Most invoked deity in the Rigveda. He wields the thunderbolt (Vajra) and rides the elephant Airavata. The Baal of the Hindu line - the storm-king counterfeit with thunder and lightning as his weapons. In later Hindu stories Indra repeatedly falls through arrogance - his worship involves rain ceremonies and agricultural covenants for good harvests, paralleling Baal's storm-provision role in Canaan. Pronunciation: IN-drah.",
    manifestations: "King-of-heaven pride; pride-based collapse through arrogance that repeats across generations; storm warfare; false divine kingship; elephant imagery in Hindu spiritual context; Vedic ancestral practice in older family members; agricultural covenant for rain with spiritual dimensions",
    entryPoints: "Vedic ritual invoking Indra for rain and victory; storm worship in Hindu context; Indra puja; South Asian ancestral practice with Indra invocation particularly in older generation families from pre-Trimurti Hindu tradition; rain ceremonies with spiritual dimensions in agricultural communities",
    legalRights: "Vedic ritual involving Indra, ancestral Hindu worship with Indra invocation, storm worship in Hindu context, rain covenant with Indra for agricultural provision",
    scripture: "Job 38:1 - God speaks from the whirlwind - He alone commands the storm. Psalm 29 - the voice of the LORD is over the waters; the voice of the LORD strikes with lightning. 1 Kings 18 - Elijah vs. Baal the storm god - God defeats the false storm king.",
    symptoms: "Pride-based collapse; storm warfare; false divine kingship; elephant imagery in Hindu spiritual context; Vedic ancestral practice; rain prayer directed outside God",
    companionSpirits: "Pride, Leviathan, Baal (parallel spirit), Storm spirits, Thunder Beings",
    assignment: "Vedic-era storm king principality over ancestral Hindu bloodlines; pride-based spiritual kingship; atmospheric second-heaven authority in Hindu cosmology",
    wriNotes: "Indra is the Vedic-era Baal equivalent. Address in sessions with South Asian heritage where Vedic ancestral practice (older generation with pre-Trimurti Hindu focus) is in the bloodline. His pride-collapse pattern - repeated falls through arrogance - is a signature symptom pointing to Indra specifically.",
  },
  {
    name: "Yama",
    aka: "Yamraj, Lord of Death, King of the Underworld, Dharmaraja, Judge of the Dead. Pronunciation: YAH-mah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Death",
    parentStrongman: "Death",
    description: "The Hindu god of death and the underworld - the judge who determines the fate of souls after death. He holds the record of every person's deeds and passes judgment accordingly. He rides a black buffalo, carries a noose (Pasha) to capture souls, and wields a staff. His messengers (Yamadutas) collect souls at the moment of death. Associated with ancestor worship and the Pitru Paksha ritual - a fortnight observed annually where the living feed the dead through ceremony (shraddha). Pitru Paksha (Mahalaya) is a major annual observance in which food and water are offered to deceased ancestors through rituals performed by a priest or family head, with the belief that Yama's messengers release the ancestors for this period to receive the offerings. Pronunciation: YAH-mah.",
    manifestations: "Death and judgment fear; extreme fear of dying that is spiritually sourced; Pitru Paksha or Shraddha ancestor worship patterns; connection to the dead through ritual feeding of ancestors; death judgment consciousness - constant sense of being evaluated for sins by an unseen judge; black buffalo imagery in dreams; noose symbolism",
    entryPoints: "Pitru Paksha (Mahalaya) ancestral ritual - feeding the dead through Shraddha ceremony; Yama puja; ancestor worship in Hindu context; South Asian death ritual; Shraddha ceremony performed for deceased family members; Tarpan (water offering to the dead); fear of judgment rooted in Hindu cosmology rather than God's truth",
    legalRights: "Pitru Paksha / Shraddha ceremony participation or family observance (feeding the dead), Tarpan water offering to ancestors, Yama puja, death ritual participation in Hindu context",
    scripture: "Hebrews 9:27 - it is appointed for man to die once, and after that comes judgment - God's judgment, not Yama's. John 5:22 - the Father has entrusted all judgment to the Son. Revelation 1:18 - Jesus holds the keys of death and Hades, not Yama.",
    symptoms: "Death fear; ancestor worship through feeding rituals; Pitru Paksha or Shraddha in family; death judgment consciousness; black imagery at death; noose symbolism; extreme fear of dying",
    companionSpirits: "Death, Fear of Death, Necromancy, Ancestor spirits, Anubis (Egyptian parallel function), Familiar spirits of the dead",
    assignment: "Death and judgment over Hindu bloodlines; controlling the moment of death and the fate of souls in Hindu cosmology; operating through ancestor worship and Pitru Paksha / Shraddha ritual",
    wriNotes: "Yama is active in sessions where South Asian ancestor worship is in the background, particularly Pitru Paksha / Shraddha. The ceremony of feeding the dead (Shraddha) combined with Tarpan (water offerings to ancestors) are specific legal grounds. Address in sessions with Indian heritage where fear of death or death judgment is a presenting issue, and where Shraddha or Pitru Paksha have been practiced in the family.",
  },
  {
    name: "Naga",
    aka: "Nagas (plural), Serpent Deities, Vasuki (Shiva's serpent), Shesha/Ananta (Vishnu's serpent), Manasa (serpent goddess). Pronunciation: NAH-gah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Leviathan",
    parentStrongman: "Leviathan",
    description: "A class of semi-divine serpent beings in Hindu mythology - supernatural cobras with human heads, or humans with serpent lower bodies. They control water, the underworld, and are associated with fertility, wisdom, and poison. Vasuki is the serpent worn around Shiva's neck (used to churn the cosmic ocean). Shesha/Ananta is the infinite serpent on whom Vishnu rests in the cosmic ocean. Manasa is the serpent goddess of fertility and healing from snake bites. The Nag Panchami festival involves literally feeding milk to live cobras as divine serpent-gods - a direct blood-and-covenant act of serpent worship. Thousands of snake mounds and Naga stone idols are found across South India and are the focus of local puja. Pronunciation: NAH-gah.",
    manifestations: "Serpent manifestations in deliverance - cobras appearing in dreams or visions with spiritual significance; marine kingdom manifestations with Indian/Hindu ancestry; Nag Panchami in family history; water-connected spiritual oppression; serpent tattoos with spiritual intent; cobra as a protective spiritual symbol in home decor; Naga stone or serpent idol in home or ancestral village",
    entryPoints: "Nag Panchami festival - feeding live cobras with milk as an act of worship; Naga puja; snake worship in any Hindu context; cobra or serpent idol in home or ancestral village temple; Vasuki or Shesha invocation in Hindu ritual; ancestral snake worship in South Asian family tradition; serpent tattoo with spiritual intent in Hindu context; Naga stone (serpent idol) veneration in local temple or household",
    legalRights: "Nag Panchami participation and milk-feeding of live cobras, Naga puja, snake worship covenant, cobra feeding ritual, ancestral serpent worship in Hindu family, Naga stone or serpent idol veneration, serpent tattoo with devotional intent",
    scripture: "Numbers 21:9 - Moses made a bronze snake and put it on a pole - God's reversal of serpent power pointing to Christ. John 3:14-15 - just as Moses lifted up the snake in the wilderness, so the Son of Man must be lifted up. Revelation 20:2 - he seized the dragon, that ancient serpent, who is the devil, and bound him.",
    symptoms: "Serpent manifestations; cobra or snake in dreams with spiritual charge; Nag Panchami in family; water-connected oppression; serpent tattoos with spiritual meaning; marine kingdom manifestations with Indian ancestry; Naga stone or serpent idol in home",
    companionSpirits: "Leviathan, Marine Kingdom, Kundalini (serpent connection - the Kundalini is the awakened Naga), Shiva (Vasuki around his neck), Witchcraft, Familiar spirits",
    assignment: "Serpent-deity class over Hindu bloodlines; water and underworld kingdom authority; Kundalini serpent dimension; operating through Nag Panchami covenant and cobra worship",
    wriNotes: "Naga spirits are the serpent-class working under Leviathan in the Hindu line. In sessions with Indian heritage where serpent manifestations appear during deliverance, address the Naga spirits specifically. The Vasuki connection (serpent around Shiva's neck) means Naga spirits and Shiva spirits work in tandem - address together. Nag Panchami milk-feeding of live cobras is a direct covenant act - have the person renounce this specifically if it is in the family history.",
  },
  {
    name: "Kama",
    aka: "Kamadeva, Manmatha, Smara, Ananga (the Bodiless One after Shiva burned him), God of Love and Sexual Desire. Pronunciation: KAH-mah",
    hierarchyCategory: "Hindu / Vedic Spirit Line",
    strongman: "Lust",
    parentStrongman: "Jezebel",
    description: "The Hindu god of love, desire, attraction, and sexual passion - the Hindu Eros/Cupid. He was burned to ash by Shiva's third eye for attempting to distract Shiva from meditation by shooting him with an arrow of lust. Now called Ananga (the Bodiless One) - he operates invisibly as a spirit of lust with no body, no visible source, just an invisible compulsion. The Kama Sutra (Aphorisms of Kama, attributed to Vatsyayana, approximately 400 CE) is the ancient Hindu text on sexual practice and the most widely disseminated ancient sexual manual in human history. Kama is the patron spirit behind the Kama Sutra and all Hindu Tantric sexual practice. His bodiless nature as Ananga means he produces lust that feels sourceless and supernatural in its persistence - lust that survives prayer because the body is the covenant object and needs to be specifically addressed. Pronunciation: KAH-mah.",
    manifestations: "Lust and sexual compulsion that feels invisible and sourceless; Kama Sutra in personal practice or family history; sexual desire directed spiritually through Tantric practice; invisible sexual influence operating in environments including schools, workplaces, or homes where Kama is active; pornography with Eastern spiritual aesthetics or Tantric imagery; sexual compulsion that survives strong prayer and feels supernatural - the Ananga bodiless pattern",
    entryPoints: "Kama Sutra engagement in any form including study or practice; Tantric sexual initiation or practice; Kama puja; lust that entered through Hindu cultural exposure; environments where Kama or Tantric energy is actively invoked; New Age sexual spirituality rooted in Hindu Tantra",
    legalRights: "Kama Sutra engagement, Tantric sexual initiation, lust spirits invited through Hindu sexual spirituality, Kama invocation",
    scripture: "1 Thessalonians 4:3-5 - it is God's will that you be sanctified: that you avoid sexual immorality. 1 Corinthians 6:18 - flee sexual immorality. Galatians 5:19-21 - the works of the flesh include sexual immorality, impurity, debauchery.",
    symptoms: "Compulsive lust feeling invisible and sourceless; Kama Sutra in background; Tantric sexual practice; lust that survives prayer with supernatural persistence; sexual spiritual confusion",
    companionSpirits: "Lust, Sexual Perversion, Tantra spirits, Jezebel, Kundalini (the sexual-spiritual gateway), Kali (Tantra connection)",
    assignment: "Lust and sexual desire over Hindu bloodlines; operating invisibly as the Bodiless One after Shiva burned him; patron of the Kama Sutra and all Hindu sexual spirituality",
    wriNotes: "Kama is the Hindu invisible lust spirit - Ananga the Bodiless One. In sessions where sexual sin is the presenting issue and has supernatural persistence that survives normal deliverance, look for Hindu entry points including yoga, Tantra, the Kama Sutra, or environmental exposure to Tantric or Hindu sexual spirituality. The bodiless pattern means he operates without an obvious hook and must be called out specifically by name as Kama or Kamadeva.",
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
