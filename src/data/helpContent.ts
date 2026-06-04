export interface HelpArticle {
  id: string
  title: string
  category: 'getting-started' | 'features' | 'tiers' | 'teams' | 'ministry' | 'glossary'
  keywords: string[]
  content: string
  icon: string
}

export const helpArticles: HelpArticle[] = [
  {
    id: 'gs-welcome',
    title: 'Welcome to War Room Intel',
    category: 'getting-started',
    keywords: ['welcome', 'start', 'new', 'begin', 'what is', 'wri', 'platform'],
    icon: '🎖',
    content: `War Room Intel is a ministry intelligence platform for deliverance ministers. Think of it as your command center for spiritual warfare ministry.

The platform gives you:
- Intelligence on demonic spirits and their operations
- Tools to run deliverance sessions
- Community with other ministers
- Daily briefings and assignments
- Case file management
- AI-powered ministry assistant (SOL)`,
  },
  {
    id: 'gs-tiers',
    title: 'Membership Tiers',
    category: 'tiers',
    keywords: ['tier', 'watchman', 'soldier', 'commander', 'general', 'founding', 'plan', 'upgrade', 'membership', 'free', 'paid'],
    icon: '🏅',
    content: `War Room Intel has 5 membership tiers:

🔭 WATCHMAN (Free)
Entry level. Access to community, SITREP, basic intel, and Daily Brief.

⚔ SOLDIER
Full platform access. Deliverance Protocol, case files, Fire Teams, SOL AI assistant, Field Manual.

🎖 COMMANDER
Everything in Soldier plus Cover All groups, advanced analytics, priority support.

⭐ GENERAL
Full access to all features, early access to new tools, direct ministry consultation.

🔱 FOUNDING GENERAL (Lifetime)
Lifetime access, all features, founding member recognition, permanent rate.`,
  },
  {
    id: 'feat-sitrep',
    title: 'SITREP — Situation Report Feed',
    category: 'features',
    keywords: ['sitrep', 'feed', 'post', 'community', 'share', 'prayer', 'report'],
    icon: '📡',
    content: `SITREP is your real-time intelligence feed — like a ministry Twitter.

Post prayer requests, field reports, breakthroughs, and ministry updates.
Other ministers can see and respond to your SITREPs.

How to post:
1. Tap the SITREP tab
2. Tap the compose area
3. Type your report
4. Tap Send

Tips:
- Keep reports concise and actionable
- Use for prayer requests, breakthroughs, and field intel
- The Regiment channel shows all community SITREPs`,
  },
  {
    id: 'feat-daily-brief',
    title: 'Daily Brief',
    category: 'features',
    keywords: ['daily', 'brief', 'devotion', 'morning', 'scripture', 'prayer', 'mission', 'spirit of the day'],
    icon: '☀️',
    content: `The Daily Brief is your morning command briefing — delivered fresh each day.

Sections:
- Atmosphere Check-In — mark your spiritual status (Victorious, Carrying, Assignment)
- Today's Briefing — devotional teaching on a ministry topic
- Spirit of the Day — intel on a specific demonic spirit
- Daily Missions — 3 kingdom assignments for today
- SOL Commentary — Dake's Bible notes on the day's scripture
- Evening Prayer — for closing out your day

The brief changes based on time of day:
☀️ Morning (4am-noon)
🌤 Midday (noon-4pm)
🌙 Evening (4pm-midnight)`,
  },
  {
    id: 'feat-deliverance-protocol',
    title: 'Deliverance Protocol',
    category: 'features',
    keywords: ['deliverance', 'protocol', 'spirit', 'session', 'jezebel', 'command', 'renunciation', 'legal grounds'],
    icon: '⚔',
    content: `Deliverance Protocol generates a complete battle plan for a deliverance session.

How to use:
1. Go to Session Center → Deliverance Protocol
2. Select mode: Spirit Name or Manifestation
3. Type the spirit name (e.g. "Jezebel") or describe the manifestation
4. Check "Include cluster spirits" for related spirits
5. Tap Generate Protocol

The protocol includes:
- Spirit Intel — identity and operation
- Legal Grounds — how it gained access
- Renunciations — prayers to lead the person through
- Commands — direct binding/loosing commands
- Post-Session — aftercare steps
- Cluster Spirits — related spirits to address`,
  },
  {
    id: 'feat-sol',
    title: 'SOL — Ministry AI Assistant',
    category: 'features',
    keywords: ['sol', 'ai', 'assistant', 'ask', 'question', 'intelligence', 'artificial'],
    icon: '🔥',
    content: `SOL (Strategic Operations Link) is your AI-powered ministry intelligence officer.

SOL can:
- Answer questions about demonic spirits and their operations
- Provide biblical insight on spiritual warfare
- Help you research a spirit or manifestation
- Generate devotional content
- Assist with case notes

How to access:
- Tap the SOL icon (flame) anywhere on the platform
- Or go to Messages → SOL Intelligence tab

SOL is trained on Dake's Bible, deliverance ministry literature, and WRI's demon database.`,
  },
  {
    id: 'feat-dms',
    title: 'Direct Messages',
    category: 'features',
    keywords: ['dm', 'direct message', 'message', 'chat', 'private', 'send message'],
    icon: '💬',
    content: `Direct Messages let you have private conversations with other ministers.

How to start a DM:
1. Find a member in the community
2. Tap their name/avatar
3. Tap "Send Message"
4. They receive a DM request
5. Once they accept, you can chat

DM features:
- Real-time messaging
- Push notifications when you receive a message
- Conversation history preserved
- Message requests protect you from spam`,
  },
  {
    id: 'teams-sentinel',
    title: 'Sentinels — Covenant Pairs',
    category: 'teams',
    keywords: ['sentinel', 'pair', 'covenant', 'accountability', 'partner', '30 day', 'sprint'],
    icon: '⚔',
    content: `Sentinels are covenant accountability pairs — two ministers who commit to 30-day prayer sprints together.

How it works:
- Send a Sentinel request to another minister
- They accept → a private channel opens between you
- 30-day sprint begins
- Check in daily, pray together, hold each other accountable
- After 30 days, renew or complete the sprint

Rules:
- Maximum 4 active Sentinels at one time
- Must be mutual — both parties agree
- Private channel only visible to the two of you`,
  },
  {
    id: 'teams-fire',
    title: 'Fire Teams — Assignment Groups',
    category: 'teams',
    keywords: ['fire team', 'group', 'assignment', 'warfare', 'intercession', 'team', 'create'],
    icon: '🔥',
    content: `Fire Teams are small groups (3-8 people) assembled for a specific spiritual assignment.

Assignment types:
- 🙏 Intercession — sustained prayer focus
- ⚔ Warfare — active spiritual combat
- 📡 Assignment — specific ministry task
- 📋 Coordination — logistics and planning
- 🔥 Prayer — general prayer group

How to create:
1. Go to Messages → tap + next to Fire Teams
2. Name your team
3. Select assignment type
4. Invite members (max 7)
5. Tap Deploy Fire Team

Requires Soldier+ tier to create.`,
  },
  {
    id: 'teams-cover-all',
    title: 'Cover All — Territory Groups',
    category: 'teams',
    keywords: ['cover all', 'territory', 'regional', 'coverage', 'geographic', 'area'],
    icon: '🛡',
    content: `Cover All groups are territory-based prayer coverage teams of up to 20 people.

Used for:
- Geographic region prayer coverage
- City or county spiritual mapping
- Sustained territorial intercession

Requires Commander+ tier to create.
Members can be from any tier.`,
  },
  {
    id: 'feat-arsenal',
    title: 'Arsenal — Ministry Resources',
    category: 'features',
    keywords: ['arsenal', 'resources', 'library', 'documents', 'files', 'sermons', 'teachings'],
    icon: '📚',
    content: `The Arsenal is your ministry resource library — sermons, teachings, documents, and reference materials.

What you can store:
- Sermon notes and transcripts
- Teaching materials
- Deliverance session resources
- Ministry documents
- Personal study notes

Upload via the Arsenal section or through the Personal Ministry Library.`,
  },
  {
    id: 'feat-ops-dashboard',
    title: 'Ops Dashboard',
    category: 'features',
    keywords: ['ops', 'dashboard', 'overview', 'stats', 'ministry', 'activity'],
    icon: '📊',
    content: `The Ops Dashboard is your ministry command center overview.

Shows:
- Ministry activity summary
- Case file status
- Community engagement
- Recent session notes
- Ministry metrics

Access via Field OPS → Ops Dashboard in the sidebar.`,
  },
  {
    id: 'feat-case-files',
    title: 'Case Files',
    category: 'features',
    keywords: ['case', 'file', 'client', 'session', 'notes', 'record', 'track'],
    icon: '📁',
    content: `Case Files let you track ministry recipients across multiple sessions.

Each case file includes:
- Recipient information
- Session history
- Manifestation records
- Prayer notes
- Progress tracking

Access via Field OPS → Case Files.
Requires Soldier+ tier.`,
  },
  {
    id: 'feat-intel-archive',
    title: 'Intel Archive — Demon Database',
    category: 'features',
    keywords: ['intel', 'archive', 'demon', 'database', 'spirit', 'search', 'rank', 'hierarchy'],
    icon: '🗄',
    content: `The Intel Archive is WRI's master demon intelligence database — the most comprehensive deliverance reference on the platform.

Contains:
- Spirit names and aliases
- Kingdom rank and hierarchy
- Manifestation patterns
- Legal grounds and entry points
- Biblical references
- Cluster spirits

Search by spirit name, manifestation, or category.
Built from Win Worley, Frank Hammond, and WRI research.`,
  },
  {
    id: 'glossary-sitrep',
    title: 'Glossary: SITREP',
    category: 'glossary',
    keywords: ['sitrep', 'situation report', 'military', 'term', 'meaning'],
    icon: '📖',
    content: `SITREP = Situation Report

Military term for a concise report on current operational status.
In WRI, it's your real-time ministry feed where you share:
- What's happening in your ministry
- Prayer requests
- Breakthroughs and testimonies
- Field intelligence from sessions`,
  },
  {
    id: 'glossary-sol',
    title: 'Glossary: SOL',
    category: 'glossary',
    keywords: ['sol', 'meaning', 'acronym', 'what does sol stand for'],
    icon: '📖',
    content: `SOL = Strategic Operations Link

WRI's AI-powered ministry intelligence officer.
Named after the concept of light (sol = sun in Latin) — bringing clarity to spiritual warfare intelligence.`,
  },
]

export const helpCategories = [
  { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
  { id: 'features',        label: 'Features',        icon: '⚙️' },
  { id: 'tiers',           label: 'Membership',      icon: '🏅' },
  { id: 'teams',           label: 'Teams & Groups',  icon: '⚔' },
  { id: 'ministry',        label: 'Ministry Tools',  icon: '📋' },
  { id: 'glossary',        label: 'Glossary',        icon: '📖' },
]
