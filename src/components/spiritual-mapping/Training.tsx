import { useState } from 'react'

const G = '#C9A84C'
const BG = '#0D0B14'
const SURF = '#12101e'
const BDR = 'rgba(201,168,76,0.22)'
const TXT = '#e8dcc8'
const DIM = '#a09080'
const MUT = '#6b5e45'
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

interface Module {
  id: string
  title: string
  icon: string
  tier: 'free' | 'soldier'
  lessons: { title: string; content: string }[]
}

const MODULES: Module[] = [
  {
    id: 'foundations',
    title: 'Foundations of Spiritual Mapping',
    icon: '📖',
    tier: 'free',
    lessons: [
      {
        title: 'What Is Spiritual Mapping?',
        content: `**Spiritual mapping** is the systematic research and discernment of the spiritual condition of a geographic region — its history, its current state, and the spiritual forces operating within it.

It is not divination, and it is not witchcraft. It is intelligence gathering for the purposes of informed, targeted intercessory prayer.

The goal is simple: **to pray with knowledge rather than ignorance.**

Just as a military operation begins with intelligence, a spiritual warfare campaign over a region should begin with thorough research and discernment. You cannot effectively pray against what you do not understand.

**Three pillars of spiritual mapping:**
- **Research** — historical, cultural, genealogical investigation
- **Discernment** — prophetic sensitivity to the spiritual realm
- **Intercession** — targeted prayer based on intelligence gathered

The product of spiritual mapping is not academic curiosity — it is a **Field Intelligence Dossier** that equips an intercession team to pray with surgical precision.`
      },
      {
        title: 'What Spiritual Mapping Is NOT',
        content: `Spiritual mapping is often misunderstood. Clarity on what it is NOT prevents dangerous errors.

**It is NOT:**
- A séance, spirit communication, or mediumship
- Divination or fortune-telling
- Astral projection or remote viewing
- An invitation for demonic contact
- Commanding demons to speak or give information

**The distinction is critical:** We do not seek information FROM spirits. We seek information ABOUT spirits — through historical research, prophetic discernment given by the Holy Spirit, and on-site prayer.

Daniel never asked the Prince of Persia to reveal itself — he sought God through fasting and prayer, and God revealed the spiritual warfare taking place (Daniel 10).

Nehemiah did not communicate with the spirits of Jerusalem — he observed the broken walls, prayed to God, and received his assignment (Nehemiah 2).

The Numbers 13 spies did not invite Canaanite spirits to speak — they observed the land and reported what they saw.

**The authority is always God's.** We are observers and intercessors, not interrogators of darkness.`
      },
      {
        title: 'Biblical Foundations',
        content: `Three primary biblical texts establish the mandate for spiritual mapping:

**Daniel 10 — The Prince Model**
Daniel 10 reveals that geographic regions have assigned spiritual princes (territorial spirits). The Prince of Persia and the Prince of Greece are named. These are not human rulers — they are demonic principalities assigned to specific geographic territories.

The implications:
- Nations and regions have territorial spirits
- These spirits resist the purposes of God in their territory
- Prayer and fasting break their resistance
- God dispatches angelic assistance when His people pray

**Nehemiah 2 — The Reconnaissance Model**
Before Nehemiah prayed strategically for Jerusalem, he surveyed the walls by night. He walked the territory, observed the damage, and assessed the condition before he formulated his prayer strategy.

This is the spiritual mapping model: survey before strategy.

**Numbers 13 — The Spy Model**
God commanded reconnaissance before conquest. The twelve spies were sent to gather intelligence — what is the land, what are the people, what are the cities, what are the strongholds.

Only Caleb and Joshua combined accurate intelligence with faith. The others gathered accurate data but drew faithless conclusions.

The lesson: spiritual mapping requires both accurate intelligence AND faith in God's authority over what was found.`
      },
    ]
  },
  {
    id: 'team-formation',
    title: 'Team Formation & Safeguards',
    icon: '⚔',
    tier: 'free',
    lessons: [
      {
        title: 'The 3-Unit Structure',
        content: `Effective spiritual mapping teams operate in a three-unit structure. No one should do this work alone.

**Unit 1: The Research Team**
- Historians, genealogists, and researchers
- Gather documented evidence: court records, newspapers, church histories, land records
- Build the Master Timeline of the region
- Identify the 4 root defilements (bloodshed, idolatry, broken covenants, sexual sin)

**Unit 2: The Discernment Team**
- Trained intercessors with tested prophetic gifts
- Conduct on-site prayer walks and reconnaissance
- Log prophetic impressions, dreams, and visions related to the region
- Provide spiritual intelligence that research cannot supply

**Unit 3: The Intercession Team**
- The prayer covering and action team
- Conducts the actual warfare prayers over the region
- Practices identificational repentance (Nehemiah 1, Daniel 9 model)
- Must have apostolic covering and personal deliverance clearance

**Key principle:** No unit operates without the others. Research without discernment is incomplete. Discernment without research is ungrounded. Intercession without either is blind.`
      },
      {
        title: 'Dangers & Safeguards',
        content: `Spiritual mapping carries genuine spiritual risk when done improperly. These are not theoretical dangers.

**Primary dangers:**

**1. Spiritual Pride**
The most common danger. Knowledge of territorial spirits can produce spiritual elitism. Remember: you are a servant of the Most High, not a spiritual warrior elite.

**2. Unauthorized Confrontation**
Do not confront territorial spirits directly without clear apostolic authorization. Jude 9 — even Michael the archangel would not bring a slanderous accusation against the devil but said "The Lord rebuke you."

**3. Unprotected Personnel**
Every team member must:
- Have personal deliverance clearance (cleared of known open doors)
- Be under genuine pastoral/apostolic covering
- Be in active prayer covering for the duration of the operation

**4. Spiritual Contamination**
Some sites carry heavy spiritual atmosphere. Do not enter known high-risk sites without the full team present and in prayer.

**5. Trauma Without Processing**
What you observe on-site may be disturbing. Build debriefing into the team structure.

**Safeguards:**
- Apostolic covering required
- Personal deliverance confirmed before operation
- Full prayer covering for team members' households
- Never operate in the flesh — always start with worship
- Always end with declaration of God's sovereignty over the region`
      },
    ]
  },
  {
    id: 'geography',
    title: 'Geography & Boundary Discernment',
    icon: '🗺',
    tier: 'soldier',
    lessons: [
      {
        title: 'Defining the Region',
        content: `Region definition is both a natural and spiritual exercise. The geographic boundary of your assignment matters.

**Natural boundary markers:**
- Watershed boundaries (rivers, ridgelines)
- County and city lines (often established through historical covenants)
- Historical land grants and treaty boundaries
- Cultural identity boundaries ("we're from the Valley" vs. the hills)

**Spiritual boundary considerations:**
Spiritual mapping regions often align with:
- Ancient tribal territories (Cherokee, Choctaw, Chickasaw, etc.)
- Land grants tied to specific spiritual covenants
- Historic church jurisdictions
- Economic or industrial zones with documented spiritual history

**Redemptive Gifts of Regions:**
Bill Gothard and Arthur Burk identified seven redemptive gifts that apply not just to individuals but to geographic regions:

- **Prophet** — calls people to truth, often experiences persecution
- **Servant** — deep community service culture
- **Teacher** — centers of learning, universities, education
- **Exhorter** — highly relational, visionary, mobilizing
- **Giver** — economic prosperity or strategic resource centers
- **Ruler** — organizational and governmental strength
- **Mercy** — healing culture, compassionate communities

Identifying a region's redemptive gift reveals both God's design AND the enemy's perversion of that gift. Poverty is the perversion of Giver. Isolation is the perversion of Prophet.`
      },
    ]
  },
  {
    id: 'research',
    title: 'The Research Phase',
    icon: '🔍',
    tier: 'soldier',
    lessons: [
      {
        title: 'The 6 Research Categories',
        content: `Comprehensive spiritual mapping research covers six categories:

**1. History**
- Indigenous peoples and spiritual practices
- Founding events, land grants, early covenants
- Major historical events: wars, economic booms/busts, disasters

**2. Current Conditions**
- Addiction and substance abuse statistics
- Crime and violent crime data
- Economic indicators and poverty rates
- Political and social climate

**3. Occult Activity**
- Active occult groups, covens, New Age centers
- Folk magic and traditional spiritual practices
- Documented paranormal history

**4. Church Landscape**
- Denominations present and their history
- Known revivals, spiritual awakenings
- Church splits and division patterns

**5. Ancestry**
- Native American tribal heritage of the land
- Pioneer and settler spiritual practices
- Generational sin patterns in founding families

**6. News & Current Events**
- Recent crimes, deaths, and tragedies
- Economic stories with spiritual dimension
- Religious or spiritual events in the community

**The 4 Root Defilements (Numbers 35:33):**
All spiritual corruption of land traces to four root sins:
1. **Bloodshed** — violent death: murder, sacrifice, abortion
2. **Idolatry** — worship of false gods, land dedications
3. **Broken Covenants** — treaties broken, agreements violated
4. **Sexual Perversion** — sexual sin that defiles the land`
      },
      {
        title: 'The Master Timeline',
        content: `The Master Timeline is the essential research artifact — a chronological record of every spiritually significant event in the region's history.

**What goes on the timeline:**
- Land title changes and ownership transfers
- Founding covenants and dedications
- Documented bloodshed events (dates and locations)
- Economic booms and collapses
- Spiritual events: revivals, religious conflicts
- Natural disasters
- Political events with spiritual dimension
- Lodge or secret society activity dates

**How to build it:**
1. Begin with indigenous territorial history (go back as far as possible)
2. Work forward chronologically
3. Note geographic specificity — WHERE did each event occur?
4. Identify patterns — what repeats? What clusters?
5. Note what was happening NATIONALLY during local events

**Pattern recognition:**
The timeline reveals:
- Cycles of destruction (poverty → crime → violence → poverty)
- Generational timing patterns (every 20 years? Every generation?)
- Entry point timing (what opened the door to each stronghold?)`
      },
    ]
  },
  {
    id: 'field-recon',
    title: 'Field Reconnaissance',
    icon: '📍',
    tier: 'soldier',
    lessons: [
      {
        title: 'Site Categories & Markers',
        content: `Field reconnaissance involves visiting significant sites within the region and conducting prophetic prayer walks.

**Site categories with marker colors:**

🔴 **Red — High Spiritual Danger**
- Known occult ritual sites
- Documented sacrifice locations
- Active demonic strongholds
- Masonic temples, occult gathering sites

🟠 **Orange — Historical Bloodshed**
- Battle sites, massacre locations
- Murder sites with unresolved justice
- Abortion clinics (past or present)

🟡 **Yellow — Idolatry/False Religion**
- Historic pagan worship sites
- Cherokee ceremonial grounds
- New Age centers, metaphysical gathering sites
- Land dedication sites

🟢 **Green — Redemptive/Prophetic**
- Churches with revival history
- Prayer mountain or intercessory sites
- Sites of documented healing or breakthrough
- Water bodies with cleansing prophetic significance

**Discernment Protocol:**
At each site:
1. Enter with worship, never with fear
2. Pray in tongues and in understanding
3. Log physical sensations, emotional shifts, impressions
4. Record prophetic impressions IMMEDIATELY — memory fades
5. Never linger if spiritual atmosphere becomes oppressive
6. Debrief as a team BEFORE leaving the site area`
      },
    ]
  },
  {
    id: 'intercession',
    title: 'Intercession & Identificational Repentance',
    icon: '🙏',
    tier: 'soldier',
    lessons: [
      {
        title: 'The Nehemiah 1 / Daniel 9 Model',
        content: `Identificational repentance is the core intercession act of spiritual mapping operations. It is modeled by Nehemiah and Daniel.

**Nehemiah 1 — The Identificational Prayer:**
Nehemiah had not personally sinned against Jerusalem. He was not in the city when it fell. Yet he prayed: "I confess the sins WE have committed against you — both I and my father's house have sinned."

He identified HIMSELF with the corporate sin of Israel, even though he did not personally commit it. This is identificational repentance.

**Daniel 9 — The Thorough Pattern:**
Daniel prayed: "We have sinned and done wrong... we have not listened to your servants the prophets... to us belongs shame of face..."

Daniel was a righteous man among the most righteous in Scripture — yet he prayed "WE have sinned." He stood in for a corporate body.

**The pattern:**
1. Acknowledge the specific sin (be precise, not general)
2. Take responsibility on behalf of those who committed it
3. Renounce the covenant or agreement made through the sin
4. Ask God to forgive and cleanse the land
5. Declare God's rightful ownership over the territory
6. Invite God's redemptive purpose to be released

**Numbers 35:33:**
"Do not pollute the land where you are. Bloodshed pollutes the land, and atonement cannot be made for the land on which blood has been shed, except by the blood of the one who shed it."

The blood of Jesus is the legal basis for land cleansing. Intercession applies the blood of Jesus to specific legal grounds identified through research.`
      },
    ]
  },
]

const TIER_LEVELS: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, commander: 2, general: 3,
}

function getTierLevel(tier: string): number {
  return TIER_LEVELS[tier?.toLowerCase()] ?? 0
}

interface Props {
  userTier: string
}

export function Training({ userTier }: Props) {
  const [selectedModule, setSelectedModule] = useState(MODULES[0].id)
  const [selectedLesson, setSelectedLesson] = useState(0)
  const userLevel = getTierLevel(userTier)

  const mod = MODULES.find(m => m.id === selectedModule) || MODULES[0]
  const lesson = mod.lessons[selectedLesson]
  const canAccess = (m: Module) => m.tier === 'free' || userLevel >= 1

  function prevLesson() {
    if (selectedLesson > 0) {
      setSelectedLesson(selectedLesson - 1)
    } else {
      const idx = MODULES.findIndex(m => m.id === selectedModule)
      if (idx > 0) {
        const prevMod = MODULES[idx - 1]
        if (canAccess(prevMod)) {
          setSelectedModule(prevMod.id)
          setSelectedLesson(prevMod.lessons.length - 1)
        }
      }
    }
  }

  function nextLesson() {
    if (selectedLesson < mod.lessons.length - 1) {
      setSelectedLesson(selectedLesson + 1)
    } else {
      const idx = MODULES.findIndex(m => m.id === selectedModule)
      if (idx < MODULES.length - 1) {
        const nextMod = MODULES[idx + 1]
        if (canAccess(nextMod)) {
          setSelectedModule(nextMod.id)
          setSelectedLesson(0)
        }
      }
    }
  }

  function renderContent(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', color: G, marginTop: 16, marginBottom: 6 }}>{line.replace(/\*\*/g, '')}</div>
      }
      if (line.startsWith('- ')) {
        return <div key={i} style={{ paddingLeft: 16, marginBottom: 4, display: 'flex', gap: 8, color: TXT, fontSize: 14, fontFamily: crimson, lineHeight: 1.6 }}><span style={{ color: G, flexShrink: 0 }}>•</span><span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8c97a">$1</strong>') }} /></div>
      }
      if (line.match(/^\d+\. \*\*/)) {
        return <div key={i} style={{ paddingLeft: 16, marginBottom: 6, color: TXT, fontSize: 14, fontFamily: crimson, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8c97a">$1</strong>') }} />
      }
      if (!line.trim()) return <div key={i} style={{ height: 10 }} />
      return <div key={i} style={{ color: TXT, fontSize: 14, fontFamily: crimson, lineHeight: 1.7, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e8c97a">$1</strong>') }} />
    })
  }

  const modIdx = MODULES.findIndex(m => m.id === selectedModule)
  const hasPrev = selectedLesson > 0 || modIdx > 0
  const hasNext = selectedLesson < mod.lessons.length - 1 || modIdx < MODULES.length - 1

  return (
    <div style={{ display: 'flex', height: '100%', background: BG, overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${BDR}`, background: SURF, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '20px 16px 12px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.2em', color: MUT }}>
          TRAINING ACADEMY
        </div>
        {MODULES.map(m => {
          const locked = !canAccess(m)
          const active = m.id === selectedModule
          return (
            <div key={m.id}>
              <button
                onClick={() => { if (!locked) { setSelectedModule(m.id); setSelectedLesson(0) } }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', background: active ? `rgba(201,168,76,0.08)` : 'transparent',
                  borderLeft: `2px solid ${active ? G : 'transparent'}`,
                  border: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none',
                  borderLeftWidth: 2, borderLeftStyle: 'solid', borderLeftColor: active ? G : 'transparent',
                  cursor: locked ? 'default' : 'pointer', textAlign: 'left',
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: active ? G : DIM }}>{m.title}</div>
                  {locked && (
                    <div style={{ fontSize: 9, fontFamily: cinzel, color: '#5C7CBF', marginTop: 2, letterSpacing: '0.06em' }}>🔒 SOLDIER+</div>
                  )}
                  {!locked && m.lessons.map((l, li) => active && (
                    <div
                      key={li}
                      onClick={e => { e.stopPropagation(); setSelectedLesson(li) }}
                      style={{
                        paddingLeft: 8, paddingTop: 6, paddingBottom: 2, cursor: 'pointer',
                        fontFamily: crimson, fontSize: 12, color: selectedLesson === li && active ? G : MUT,
                      }}
                    >
                      {li + 1}. {l.title}
                    </div>
                  ))}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 32px 14px', borderBottom: `1px solid ${BDR}`, background: SURF }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.14em', color: MUT, marginBottom: 4 }}>
            {mod.icon} {mod.title} — Lesson {selectedLesson + 1} of {mod.lessons.length}
          </div>
          <div style={{ fontFamily: cinzel, fontSize: 18, color: G, fontWeight: 600 }}>{lesson?.title}</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {canAccess(mod) ? (
            <div style={{ maxWidth: 680 }}>
              {lesson && renderContent(lesson.content)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 16 }}>
              <div style={{ fontSize: 40 }}>🔒</div>
              <div style={{ fontFamily: cinzel, fontSize: 14, color: G }}>Soldier+ Access Required</div>
              <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', maxWidth: 340, textAlign: 'center' }}>
                Upgrade your membership to access the full 6-module Spiritual Mapping training curriculum.
              </div>
              <a href="/membership" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: BG, background: G, padding: '10px 24px', borderRadius: 4, textDecoration: 'none', marginTop: 8 }}>
                UPGRADE MEMBERSHIP
              </a>
            </div>
          )}
        </div>

        {/* Navigation */}
        {canAccess(mod) && (
          <div style={{ padding: '16px 32px', borderTop: `1px solid ${BDR}`, display: 'flex', justifyContent: 'space-between', background: SURF }}>
            <button
              onClick={prevLesson}
              disabled={!hasPrev}
              style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: hasPrev ? G : MUT, background: 'transparent', border: `1px solid ${hasPrev ? BDR : 'transparent'}`, borderRadius: 4, padding: '8px 20px', cursor: hasPrev ? 'pointer' : 'default' }}
            >
              ← PREVIOUS
            </button>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, alignSelf: 'center', letterSpacing: '0.1em' }}>
              {modIdx + 1}/{MODULES.length} — {selectedLesson + 1}/{mod.lessons.length}
            </div>
            <button
              onClick={nextLesson}
              disabled={!hasNext}
              style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: hasNext ? BG : MUT, background: hasNext ? G : 'transparent', border: `1px solid ${hasNext ? G : 'transparent'}`, borderRadius: 4, padding: '8px 20px', cursor: hasNext ? 'pointer' : 'default' }}
            >
              NEXT →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
