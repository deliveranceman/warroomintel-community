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

if (!TOKEN) { console.error('ERROR: AIRTABLE_TOKEN not found in .env'); process.exit(1); }

const HEADERS = { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

const FIELD_MAP = {
  name:             PRIMARY,
  aka:              'Also Known As',
  description:      'Description',
  manifestations:   'Manifestiation',
  scripture:        'Scripture Reference',
  entryPoints:      'Entry Points',
  // source / typeRank / rank / kingdom omitted — Single Select fields; values must be pre-existing options
  legalRights:      'Legal Rights',
  symptoms:         'Symptoms',
  companionSpirits: 'Companion Spirits',
  wriNotes:         'WRI Exorcist Notes',
  assignment:       'Assignment',
  hierarchyCategory:'Hierarchy Category',
  strongman:        'Strongman',
  parentStrongman:  'Parent Strongman',
};

const LABEL = 'CHEROKEE WORSHIP ADDITIONS - 3 entries';

const ENTRIES = [
  {
    name: "Asgaya Gigagei",
    aka: "The Red Man, Thunder Beings, Ani Yuntikwalaski, Thunder Beings of the West, The Little Men of the Thunder",
    typeRank: "Power",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Witchcraft / Counterfeit Holy Spirit / Storm",
    strongman: "Baal (Storm / False Worship)",
    parentStrongman: "Baal",
    description: "The Thunder Beings of Cherokee mythology - described as the most powerful servants of the Creator and revered in the first dance of the annual Green Corn Ceremony. The structure is a triune being - a father Thunder Being and his two sons - forming a deliberate counterfeit of the Trinity. The three Thunder Beings from the West were believed to directly harm people at times and directly bless crops at others. Controls atmospheric forces and presents as a divine messenger. The Green Corn Ceremony (also called the Busk or Booger Dance) was the most important annual ceremony in Cherokee life - a multi-day observance held in late summer at the communal ceremonial ground involving fasting, drinking the ritual Black Drink emetic for purification, ritual bathing (going to water), extinguishing and rekindling the sacred fire, communal confession and reconciliation, and feasting on the first new corn. The Thunder Beings received the first ceremonial dance as worship. This is a high-deception Power-class spirit that can appear as authentic prophetic or charismatic spiritual experience due to its Trinity-mimicking structure.",
    manifestations: "False prophetic experiences framed as messages from the thunder or sky; storm-related spiritual experiences that feel divine; counterfeit Holy Spirit manifestations including false tongues, false prophecy, or false spiritual feelings; agricultural or harvest strongholds over land; fear of storms combined with reverence for them; generational involvement in ceremonial worship that feels spiritually powerful; the Black Drink emetic spiritual purification pattern in family history",
    entryPoints: "Green Corn Ceremony participation - the Busk, including the fasting, going to water, Black Drink consumption, sacred fire ceremony, and first dance to the Thunder Beings; ancestral agricultural covenants with thunder spirits; storm worship or spiritual reverence for weather events; ancestral Cherokee ceremonial life; any ceremony involving the ritual extinguishing and relighting of fire with spiritual intent in Cherokee context",
    legalRights: "Green Corn Ceremony / Busk participation (especially the first dance honoring the Thunder Beings), agricultural land covenants with thunder spirits, Black Drink consumption as spiritual purification, sacred fire ceremony participation, storm reverence turning to worship, ancestral ceremonial worship including going to water ritual",
    scripture: "Job 38:25-27 - God alone commands the thunder. Psalm 29 - the voice of the LORD is in the thunder. 1 Kings 18:24 - Baal worship centered on calling on false gods for rain and storm. 2 Corinthians 11:14 - Satan himself masquerades as an angel of light.",
    symptoms: "False spiritual experiences that feel real; counterfeit tongues or prophecy; sense of divine encounter tied to weather; extreme fear of storms combined with reverence; inability to discern true Holy Spirit from false spirit; prophetic gifts that produce wrong fruit; going to water (ritual bathing in streams) as a spiritual cleansing practice in family tradition",
    companionSpirits: "Baal, False Prophet spirit, Counterfeit Holy Spirit, Divination, Religious Spirit",
    assignment: "Counterfeit worship through storm and thunder; providing false spiritual experiences to keep Cherokee descendants from encountering the true God; controlling atmospheric powers over the region",
    source: "Cherokee mythology - Green Corn Ceremony documented by James Mooney, Myths of the Cherokee (1900) and multiple ethnographic sources. Cross-cultural parallel: Thor (Norse), Baal Hadad (Canaanite), Zeus/Jupiter (Greek/Roman), Shango (Yoruba), Indra (Hindu), Tlaloc (Aztec).",
    wriNotes: "The Green Corn Ceremony / Busk is the central worship altar of the Cherokee spirit line. All major Cherokee spirits receive devotion through this ceremony. Entry points include: fasting with spiritual intent for the Busk, drinking the Black Drink emetic for spiritual purification (ilex vomitoria tea or casine tea), going to water (ritual bathing in moving water at dawn), the sacred fire ceremony (extinguishing old fire and relighting from sacred coals), and the first dance to the Thunder Beings. If any ancestor participated in the Busk, all of these covenant acts need to be renounced specifically. The three-being structure of the Thunder Beings (father and two sons) is one of the most sophisticated demonic counterfeits in Cherokee mythology - a direct Trinity mimic. Watch for this in people with Cherokee ancestry who have strong spiritual experiences but questionable fruit.",
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
    description: "The Cherokee First Woman, wife of Kana'ti, and mother of the first Cherokee people. She produced corn by rubbing her body - a creation-from-body myth with blood covenant overtones. When her sons killed her, corn grew from the ground where her blood fell - a blood covenant origin story for Cherokee agriculture. She is a full Queen of Heaven and fertility goddess archetype. Together with Kana'ti she forms the false first family of Cherokee theology - a counterfeit Adam and Eve. Her specific role is the counterfeit Mother, the feminine creator, and the spirit of provision through blood covenant rather than God's grace. She is the central deity of the Green Corn Ceremony's agricultural covenant - the corn itself is her body given to the people, making the Green Corn feast a blood covenant meal.",
    manifestations: "Queen of Heaven patterns in women; fertility and womb issues tied to generational Cherokee covenants; food and provision as a spiritual stronghold or idol; matriarchal control connected to provision; blood covenant mentality - the belief that blessing requires sacrifice of self; agricultural land strongholds in Appalachian regions; participation in the Green Corn feast as a spiritually significant communal meal",
    entryPoints: "Green Corn Ceremony participation - particularly the communal feast of first corn (the feast is literally Selu's body offered to the community); agricultural land covenants with Selu specifically; female-led Cherokee ceremonial worship; maternal bloodline with Cherokee spiritual heritage; generational covenant through the mother's family involving food, harvest, or feminine spiritual power; home gardens or agricultural practice with Cherokee spiritual significance in family history",
    legalRights: "Green Corn Ceremony feast participation (eating the sacred first corn as a blood covenant meal), agricultural land covenants, feminine blood covenant, matrilineal Cherokee spiritual heritage, provision idolatry, going to water ritual as Selu purification",
    scripture: "Jeremiah 7:18 - women knead dough to make cakes for the Queen of Heaven. Jeremiah 44:17-19 - women burning incense to the Queen of Heaven and attributing provision to her. Acts 19:27 - Diana/Artemis the great goddess whose worship controlled an economy. Revelation 17:5 - Mystery Babylon the Mother.",
    symptoms: "Queen of Heaven patterns in women's spiritual life; fertility issues; food or harvest as a spiritual stronghold; matriarchal control combined with provision control; blood covenant mentality in relationships; womb or reproductive health issues; agricultural land in family with Cherokee spiritual covenant",
    companionSpirits: "Queen of Heaven, Jezebel, Witchcraft, Kana'ti (always paired - address together), Fertility spirit, Blood Covenant spirit, Asgaya Gigagei (Green Corn Ceremony connection)",
    assignment: "Queen of Heaven authority over Cherokee maternal bloodlines; maintaining agricultural land covenants through the female line; controlling provision through blood covenant rather than God's grace; the central deity of the Green Corn Ceremony feast covenant",
    source: "Cherokee mythology - Selu and Kana'ti are foundational to Cherokee creation narratives and the origin of corn cultivation. The Green Corn Ceremony feast connection documented by James Mooney and multiple ethnographic sources. Cross-cultural parallel: Queen of Heaven/Asherah (Hebrew), Demeter/Ceres (Greek/Roman), Isis the mother goddess (Egyptian), Pachamama the earth mother (Inca), Frigg/Freya (Norse).",
    wriNotes: "Selu and Kana'ti must always be addressed together when both maternal and paternal Cherokee lines are present - they are the complete false-deity couple, a counterfeit first family. THE GREEN CORN FEAST CONNECTION: The communal feast of first corn is literally Selu's body given to the community - making it a blood covenant meal directly parallel in structure (though not in substance) to communion. Anyone with Cherokee ancestry who participated in or whose ancestors participated in the Green Corn Ceremony feast has a Selu covenant. Renounce the feast specifically in addition to the ceremony generally. Selu feeds the Queen of Heaven pattern which is one of the most overlooked principalities in modern deliverance ministry.",
  },

  {
    name: "Yunwi Tsunsdi",
    aka: "Little People, Cherokee Fairies, Dwarves of the Mountains, Yvwi Usdi",
    typeRank: "Ruling Spirit",
    rank: "Power",
    hierarchyCategory: "Cherokee Spirit Line",
    kingdom: "Familiar Spirits / Witchcraft",
    strongman: "Familiar Spirits",
    parentStrongman: "Witchcraft",
    description: "A class of spirit beings - not one entity but a race - described as small humanoid nature spirits standing about two feet tall with long hair, usually invisible, occasionally appearing as miniature child-sized people. Operate between the visible and invisible realm throughout Appalachian forests and rivers. Can be beneficial or harmful depending on relationship - a clear demonic trap of conditional blessing designed to create spiritual dependency. Known for leading children away from community, appearing to children who are lost or abused and providing comfort - a predatory spiritual adoption pattern. Associated with music, dancing, and the creative arts. In Cherokee tradition the Yunwi Tsunsdi taught people songs, medicine, and ceremonies - meaning the traditional Cherokee ceremonial repertoire itself was received from familiar spirits. The Stomp Dance - which is still practiced today by the Eastern Band of Cherokee and other Southeastern tribes - is one of the ceremonies associated with Little People transmission.",
    manifestations: "Familiar spirit attachments - knowing things that cannot be known naturally; hearing voices or music in nature that feel spiritual; spiritual attachment to children - children who report seeing small beings or having invisible friends in forested or mountain areas; folk magic in family history framed as benevolent; enchantment and fairy-type deception; receiving spiritual help from beings other than the Holy Spirit; Stomp Dance participation in family history; creative artists with unexplained spiritual connection to their craft rooted in Cherokee tradition",
    entryPoints: "Cherokee storytelling and cultural practices that honor or acknowledge the Little People; Appalachian folk magic - Granny magic, mountain folk magic, root work in the Cherokee tradition; Stomp Dance participation with spiritual intent; children's spiritual experiences in Appalachian woods or mountains; growing up in areas where Little People legends are part of active family tradition not just historical stories; receiving Cherokee traditional songs or medicine knowledge through spiritual experience rather than direct teaching",
    legalRights: "Ancestral covenants with the Little People, Appalachian folk magic practices, children dedicated to their care, generational relationship with Appalachian spirit beings, Stomp Dance participation, receiving Cherokee medicine or ceremony knowledge through the Little People",
    scripture: "Leviticus 19:31 - do not turn to mediums or familiar spirits, do not seek after them to be defiled by them. 1 Samuel 28 - Saul and the familiar spirit. Isaiah 8:19 - when they say seek those who are mediums and wizards who whisper and mutter.",
    symptoms: "Familiar spirit activity - supernatural knowing outside Holy Spirit; children with invisible companions; voices or music in natural settings; gifting in music, dance, or arts with unclear spiritual source; sense of being watched in wooded areas; folk magic passed through Appalachian family tradition; Stomp Dance in family history",
    companionSpirits: "Familiar Spirits, Divination, Nature Spirits, Witchcraft, Nunnehi",
    assignment: "Familiar spirit attachment to Cherokee descendants and Appalachian families; spiritual adoption of children; guarding folk magic traditions in the mountains; transmitting Cherokee ceremonies and medicine knowledge as a counterfeit of Holy Spirit revelation; providing counterfeit spiritual experiences to keep people from the true God",
    source: "Cherokee mythology. The Stomp Dance connection documented by multiple ethnographic sources including the Journal of Cherokee Studies. Cross-cultural parallel: Fairies/Fae (Celtic), Tomte (Norse), Jinn smaller class (Islamic), Familiar Spirits (Hebrew/biblical), Menehune (Hawaiian), Elementals (occult).",
    wriNotes: "Yunwi Tsunsdi are the most common surface-level spirits in Cherokee ancestry - expect these in anyone with even partial Cherokee blood and casual familiarity with the traditions. STOMP DANCE: The Stomp Dance is still practiced today by the Eastern Band of Cherokee Indians and is specifically associated with Little People transmission of ceremony. If a person or their family has participated in Stomp Dances as a spiritual practice (not as a cultural observer), address Yunwi Tsunsdi specifically and renounce the ceremony and the spirit helpers invoked through it. Appalachian folk magic (Granny magic) is a primary transmission vector. The child attachment pattern is the most concerning ministry issue - look for childhood spiritual experiences with small beings or voices in the woods as a primary marker.",
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
