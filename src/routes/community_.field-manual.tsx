import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/community_/field-manual')({
  ssr: false,
  component: FieldManualPage,
})

const G       = '#C9A84C'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_LEVEL: Record<string, number> = { free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4 }

const MODULES = [
  {
    id: 'authority-in-christ',
    number: 1,
    icon: '✦',
    title: 'Authority in Christ',
    subtitle: 'The foundation of all warfare',
    tier: 'free',
    intro: 'Every deliverance minister must first understand the legal and spiritual authority delegated to believers through Christ. Without this foundation, all other techniques are hollow.',
    sections: [
      {
        heading: 'What Is Delegated Authority?',
        body: `When Jesus declared "All authority in heaven and on earth has been given to me" (Matthew 28:18), He immediately followed with a commissioning: "Therefore go." This is not coincidental. The authority is given TO Him and delegated THROUGH His body — the Church.

Luke 10:19 makes this explicit: "I have given you authority to trample on snakes and scorpions and to overcome all the power of the enemy; nothing will harm you." This is present-tense, active delegation. The disciples were not told to pray for authority — they were told it had already been given.

Understanding the difference between praying FOR authority and operating FROM authority is the first major shift in a minister's development. Demons do not yield to desperation prayers. They yield to legal declarations made by those who know who they are in Christ.`,
      },
      {
        heading: 'The Name of Jesus — Jurisdiction, Not Magic',
        body: `Acts 19 records the seven sons of Sceva attempting to cast out demons using "the Jesus whom Paul preaches." The demon's response is instructive: "Jesus I know, and Paul I know about, but who are you?" They were beaten and fled naked.

The name of Jesus is not a magic word. It is a matter of jurisdiction. You must be in covenant with Jesus, walking in His authority by the Spirit, for His name to carry weight in the spirit realm. A minister who lives in unrepentant sin, operates in offense, or functions in pride will find their authority neutralized — not because the name is weak, but because they are operating outside of covenant.

The name of Jesus represents His character, His victory, His blood, and His legal standing before the Father. When you declare in His name, you are invoking all of that. Walk worthy of that name.`,
      },
      {
        heading: 'Practical Exercise: Identifying Your Position',
        body: `Before engaging in any deliverance session, a minister must take time to "put on" their identity in Christ. This is not a ritual — it is a spiritual realignment.

Spend 5–10 minutes meditating on these declarations before ministry:
• "I am seated with Christ in heavenly places" (Ephesians 2:6)
• "Greater is He who is in me than he who is in the world" (1 John 4:4)
• "I have been given authority over all the power of the enemy" (Luke 10:19)
• "No weapon formed against me shall prosper" (Isaiah 54:17)

This is not positive thinking. You are declaring legal realities that are already established in the spirit realm. You are reminding yourself — and any watching spirits — of your actual standing before God.`,
      },
    ],
  },
  {
    id: 'enemy-hierarchy',
    number: 2,
    icon: '👁',
    title: 'The Enemy\'s Hierarchy',
    subtitle: 'Knowing who you\'re fighting',
    tier: 'free',
    intro: 'The enemy operates through a structured hierarchy. Understanding this chain of command helps ministers know what they are dealing with, how high up the chain a manifestation traces, and how to target the strongman effectively.',
    sections: [
      {
        heading: 'Principalities, Powers, and Rulers',
        body: `Ephesians 6:12 lays out the hierarchy: "For our struggle is not against flesh and blood, but against the rulers, against the authorities, against the powers of this dark world and against the spiritual forces of evil in the heavenly realms."

The Greek terms here — archē (rulers/principalities), exousia (authorities/powers), kosmokrators (world-rulers of darkness), pneumatika ponērias (spiritual forces of evil) — represent descending ranks from highest to lowest. Principalities govern nations and regions. Powers govern institutions, systems, and ideologies. Rulers of darkness operate within territorial and organizational structures. Ground-level spirits work directly on individuals.

This is not speculation — it is consistent with Daniel 10, where the prince of Persia (a principality) resisted the angel for 21 days, and the prince of Greece was also named. These are not human rulers. They are demonic princes over nations.`,
      },
      {
        heading: 'Strongmen and Underlings',
        body: `Matthew 12:29 introduces the concept of the strongman: "Or again, how can anyone enter a strong man's house and carry off his possessions unless he first ties up the strong man?" This is a ministry principle: every complex demonic structure has a primary governor that must be bound before the lesser spirits can be evicted.

In practice, the presenting spirit (the one manifesting) is often not the strongman. A spirit of addiction may be fronting for a spirit of rejection, which is under a spirit of Jezebel, which is governed by a spirit of antichrist. The presenting issue is not the root. The root is what must be addressed.

Identifying the strongman requires discernment — often given through the Spirit of God (1 Corinthians 12:10, distinguishing of spirits), through the pattern of symptoms, or through the demonized person's history.`,
      },
      {
        heading: 'How Spirits Cluster',
        body: `Demons rarely operate alone. Luke 8 records a man with a "legion" — approximately 6,000 spirits organized under one governance structure. Matthew 12:43-45 describes an unclean spirit returning with "seven other spirits more wicked than itself."

Common clustering patterns observed in deliverance ministry:
• Spirit of rejection often enters with abandonment, shame, and self-hatred
• Jezebel commonly operates with Leviathan (pride), Athaliah (control of spiritual authority), and Ahab (passivity in the person's covenant relationships)
• Spirit of fear clusters with torment, infirmity, and death
• Spirit of witchcraft often accompanies familiar spirits, divination, and manipulation

When you encounter one, probe for others. Ask the Spirit what you are dealing with. The cluster must be fully evicted, or the remaining spirits will rebuild the structure.`,
      },
    ],
  },
  {
    id: 'legal-grounds',
    number: 3,
    icon: '⚖',
    title: 'Legal Grounds',
    subtitle: 'How the enemy gains access',
    tier: 'soldier',
    intro: 'Demons do not operate without legal access. Every foothold has a door — opened through sin, trauma, covenant, or inheritance. A minister who understands the legal framework can close doors permanently rather than simply driving spirits away temporarily.',
    sections: [
      {
        heading: 'The Concept of Legal Ground',
        body: `The spirit realm operates on legal principles. God is a God of justice, and His courts are real (Daniel 7:9-10, Revelation 4-5). This means that demonic access to a person's life is often permitted because of an open legal case — an unresolved sin, an inherited curse, a broken covenant, or a vow made to a false system.

This is why simple commands to "go" sometimes produce only temporary relief. The spirit may comply momentarily, but if the legal ground is not closed, it returns — often with reinforcements (Matthew 12:43-45). The command without the legal closure is like evicting a tenant without changing the locks.

The minister's role is not just eviction — it is revocation of the legal access that allowed entry.`,
      },
      {
        heading: 'Common Legal Doors',
        body: `The most common doors that give demons legal access:

GENERATIONAL SIN — Exodus 20:5 speaks of iniquity visiting to the third and fourth generation. This is not God punishing children for parents' sins — it is a spiritual inheritance law. Demonic assignments attached to bloodlines must be renounced by name and cut off through the blood of Jesus.

SOUL TIES — Unholy covenants formed through sexual sin, abusive relationships, or spiritually controlling relationships create spiritual bonds. These bonds must be broken through repentance, renunciation, and declaration of severance.

OATHS AND VOWS — Membership in fraternal orders (Freemasonry, Eastern Star), occult practices, ungodly covenants spoken in moments of crisis ("I vow to never trust anyone again") all create legal ground.

UNFORGIVENESS — Matthew 18:34-35 describes the "tormentors" that come to those who refuse to forgive. This is one of the most common reasons deliverance does not hold.

TRAUMA — Trauma creates spiritual "cracks" that can be exploited. This does not mean all trauma victims are demonized, but severe or repeated trauma often opens doors to spirits of fear, torment, and infirmity.`,
      },
      {
        heading: 'The Process of Closing Doors',
        body: `Before or during deliverance, the legal ground must be closed:

1. IDENTIFICATION — Through prayer, conversation, and the gifts of the Spirit, identify the specific legal grounds present.

2. REPENTANCE — The person must genuinely repent (not just apologize) for any sin-based access. This includes renouncing generational sin not personally committed but inherited.

3. FORGIVENESS — If unforgiveness is present, the person must choose to release the debt. This is an act of will, not feeling. Minister them through it if needed.

4. RENUNCIATION — Spoken renunciation of oaths, vows, occult involvement, and soul ties. These must be verbalized, not just thought.

5. DECLARATION — Closing the door with declaration: "I now close every door that [specific ground] has opened to the enemy. I plead the blood of Jesus over this access point and declare it permanently sealed."

Only then should eviction commands be given. The legal work must precede the ministerial work.`,
      },
    ],
  },
  {
    id: 'prayer-warfare',
    number: 4,
    icon: '🙏',
    title: 'Prayer Warfare',
    subtitle: 'Types, strategy, and posture',
    tier: 'soldier',
    intro: 'Not all prayer is warfare. Not all warfare prayer is correct. This module covers the distinct types of prayer, when to use each, the strategic posture of an intercessor, and why praying "if it be Thy will" during warfare is a tactical error.',
    sections: [
      {
        heading: 'Petition vs. Declaration vs. Intercession',
        body: `There are at least three distinct modes of prayer that function differently in the spirit realm:

PETITION is asking God to act. "Lord, heal my friend." This is appropriate in many contexts. It is the language of a child speaking to a Father.

DECLARATION is asserting what is already legally established in the spirit realm. "By the stripes of Jesus, [name] is healed." "Cancer, I command you to leave this body now in the name of Jesus." This is the language of a minister operating under delegated authority. You are not asking God to do what He already said He would do — you are enforcing it.

INTERCESSION is standing in the gap between God's will and a person or situation's current reality. It involves travail, spiritual weight, and often fasting. Ezekiel 22:30 records God looking for an intercessor — someone who would stand in the gap. This is the most costly form of prayer and the most powerful.

Mixing modes incorrectly causes confusion. You cannot both declare authority and petition God as if the outcome is uncertain in the same breath during a deliverance session.`,
      },
      {
        heading: 'Praying "If It Be Thy Will" in Warfare',
        body: `This is a common and costly mistake. Ministers approach a demonized person and pray: "Lord, if it be Your will, please set this person free."

The problem: It is always God's will for His children to be free (John 8:36, Luke 13:16, Galatians 5:1). Praying "if it be Thy will" in the context of warfare signals uncertainty in the spirit realm — and demons respond to uncertainty with confidence.

"If it be Thy will" belongs to prayers of petition in areas where the will of God is not explicitly revealed (career decisions, relationship choices, timing of events). It does not belong in deliverance ministry, healing prayer, or any arena where Scripture clearly establishes God's will.

In warfare, you declare what God has already said. You enforce what the blood already purchased. Uncertainty is not humility — it is a tactical weakness.`,
      },
      {
        heading: 'Building a Prayer Watch Culture',
        body: `Individual ministers burn out. Sustained victory comes through a prayer watch — a community of intercessors covering ministry consistently.

Key principles for establishing a watch:
• Divide hours of prayer across team members so no single person carries the whole burden
• Maintain a shared intelligence log of what the Spirit is revealing in prayer
• Rotate intercessors to prevent compassion fatigue and spiritual depletion
• Establish clear escalation protocols: some assignments require corporate fasting, not individual prayer

The enemy will always target the minister. An unwatched minister is a vulnerable minister. Priority must be given to covering those on the front lines of deliverance.`,
      },
    ],
  },
  {
    id: 'deliverance-protocol',
    number: 5,
    icon: '⚔',
    title: 'Deliverance Protocol',
    subtitle: 'Step-by-step methodology',
    tier: 'commander',
    intro: 'Deliverance ministry is not improvisation — it is a Spirit-led but structured process. This module walks through the full deliverance protocol, from intake to post-session care, covering what to expect, how to handle resistance, and how to document outcomes.',
    sections: [
      {
        heading: 'Pre-Session: Intake and Preparation',
        body: `A deliverance session should never begin cold. Pre-session preparation is essential:

MINISTER PREPARATION — Spend time in prayer, ideally fasting, before the session. Ensure you are in right standing with God and your covenant relationships. Unresolved sin or offense in the minister is a liability in the room.

INTAKE — Gather the person's history: spiritual background, generational history, trauma, occult involvement, sexual history (as relevant to identifying soul ties), any previous deliverance sessions and their results, and current spiritual practices.

TEAM COMPOSITION — Do not minister alone if possible. A minimum of two ministers is preferred: one to lead, one to intercede and observe. A third for logistics and documentation is ideal.

ROOM SETUP — Remove objects that may have spiritual attachment (crystals, occult art, ungodly symbols). The space should be physically clean and spiritually prepared through prayer and declaration.

GROUND RULES — Explain the process to the person. They should understand they must want to be free, they must cooperate (not fight the process), and they may experience physical manifestations. Consent is important.`,
      },
      {
        heading: 'The Session: Order of Operations',
        body: `A structured deliverance session follows this general order:

1. OPEN IN WORSHIP AND PRAYER — Establish the presence of God. Do not skip this. A session begun in His presence is a session positioned for victory.

2. SEAL THE ROOM — Declare the blood of Jesus over the space. Command any spirits not directly attached to the person to be bound and removed from the room. Bind interference.

3. ESTABLISH IDENTITY — Remind the person (and the spirits present) of the person's identity in Christ. Read or declare relevant scriptures.

4. ADDRESS LEGAL GROUNDS — Walk through the identified doors (from intake). Lead the person in repentance, renunciation, and forgiveness prayers systematically.

5. BIND THE STRONGMAN — Identify the governing spirit and bind it specifically before attempting to address underlings.

6. COMMAND EVICTION — In the name of Jesus, command each spirit by name (or function if name is unknown) to leave. Be specific. "Spirit of rejection, I command you to release every part of this person and go now, in the name of Jesus."

7. LISTEN TO THE SPIRIT — The Holy Spirit will direct which spirits remain, which need different legal ground addressed, and when the session is complete. Do not proceed faster than discernment allows.

8. FILL THE EMPTY HOUSE — After eviction, immediately minister to the person. The empty space must be filled with the Spirit. Lead them in receiving the Holy Spirit, declaring truth, and establishing new identity declarations.`,
      },
      {
        heading: 'Handling Resistance and Escalation',
        body: `Some sessions will encounter strong resistance. Resistance is not failure — it is information.

WHEN A SPIRIT WILL NOT LEAVE — Check for remaining legal ground. Ask the Spirit what is blocking. Common causes: unforgiveness not yet addressed, a hidden vow or oath, a generational assignment not yet renounced, or a spirit requiring a higher level of authority (Mark 9:29 — some require fasting).

PHYSICAL MANIFESTATIONS — Expect: shaking, contorting, sounds, nausea, crying, laughter (rare), unconsciousness (rare). These are manifestations of spirits leaving or resisting eviction. They are normal. Do not panic. Do not stop. Keep commanding with calm authority.

WHEN TO STOP — If the person becomes combative in ways that create safety risks, if you are spiritually depleted beyond capacity to continue safely, or if the Spirit clearly indicates to pause. Partial deliverance is better than a chaotic session that traumatizes the person further.

ESCALATION PROTOCOLS — Some assignments require team escalation: bringing in more senior ministers, calling a corporate fast, or scheduling follow-up sessions. This is not defeat. Even Jesus sent the disciples back to the city for corporate prayer in difficult cases.`,
      },
    ],
  },
  {
    id: 'maintaining-freedom',
    number: 6,
    icon: '🛡',
    title: 'Maintaining Freedom',
    subtitle: 'Post-deliverance discipleship',
    tier: 'commander',
    intro: 'The goal of deliverance is not the session — it is lasting freedom. Matthew 12:43-45 describes the spirit returning to an "empty, swept, and put in order" house. The house must be occupied, not just cleaned. Post-deliverance discipleship is not optional.',
    sections: [
      {
        heading: 'The Empty House Problem',
        body: `Jesus describes what happens when a spirit is evicted but the house is not filled: the spirit returns, finds the house empty, and brings seven spirits more wicked than itself. The person ends up worse than before.

This is why deliverance without discipleship is often counterproductive. The minister who drives spirits out and then leaves the person with no community, no Word, no accountability, and no ongoing sanctification has set up a revolving door.

The "filling" of the house includes:
• Active relationship with the Holy Spirit (not just one-time reception)
• Daily engagement with the Word
• Covenant community — people who know the person's history and walk with them
• Accountability for the specific areas where legal ground was previously open
• A clear prayer life and ongoing spiritual disciplines`,
      },
      {
        heading: 'Warning Signs of Re-infestation',
        body: `Teach newly delivered people to recognize the signs of returning assignment:
• Sudden, inexplicable return of old thought patterns that were clearly absent post-session
• Compulsive urge to return to renounced behaviors
• Isolation impulse — pulling away from community and accountability
• Resurgence of old fears or torments after a period of peace
• Dreams that were previously associated with demonic oppression

These are not automatically signs of failure. They are often tests. The returning spirit is looking for an opening. If the person has been discipled well, they will recognize the knock at the door and refuse to answer.

Teach them: "When that thought comes, it is a visitor, not a resident. Do not invite it in."`,
      },
      {
        heading: 'Building a Deliverance Aftercare Plan',
        body: `Every person who receives significant deliverance should leave with a written aftercare plan that includes:

1. DAILY DECLARATIONS — 3-5 personalized identity declarations based on the legal ground that was closed and the spirits that were evicted

2. ACCOUNTABILITY PARTNER — Someone from the community who checks in weekly for the first 3 months

3. TRIGGER AWARENESS — A list of the situations, relationships, or environments that historically opened the doors that were closed; a plan for navigating those triggers

4. ESCALATION PROTOCOL — Who to call and what to do if they feel the assignment returning. They should not feel alone in this.

5. FOLLOW-UP SESSION — Schedule a 30-day check-in to assess how freedom is holding, close any remaining doors identified post-session, and celebrate what God has done.

Freedom maintained is more powerful than freedom won and lost.`,
      },
    ],
  },
  {
    id: 'equipping-others',
    number: 7,
    icon: '🔥',
    title: 'Equipping Others',
    subtitle: 'Raising up the next generation',
    tier: 'general',
    intro: 'The ministry of deliverance was never meant to be centralized in one person. Ephesians 4:12 describes the five-fold ministry as existing "for the equipping of the saints for the work of ministry." The goal is multiplication — ministers who make ministers.',
    sections: [
      {
        heading: 'The Multiplication Mandate',
        body: `2 Timothy 2:2 gives the generational model: "And the things you have heard me say in the presence of many witnesses entrust to reliable people who will also be qualified to teach others." This is a four-generation mandate: Paul → Timothy → reliable people → others.

In deliverance ministry, this looks like:
• Senior ministers who carry the protocol and the history
• Mid-level ministers who are actively practicing under oversight
• Apprentices who are observing and beginning to participate
• Newly delivered people who are being discipled toward future ministry

Every minister should be discipling someone. Every mature minister should be raising up those who will eventually outpace them. This is not competition — it is the Kingdom.`,
      },
      {
        heading: 'What to Vet Before Releasing a Minister',
        body: `Not everyone who wants to do deliverance is ready to do deliverance. Gatekeeping is an act of love — both for the apprentice and for the people they would minister to.

Before releasing someone to lead deliverance sessions, they should demonstrate:

PERSONAL FREEDOM — They should have been through their own significant deliverance. Ministers who have not dealt with their own doors carry those open doors into sessions. This is dangerous for them and for those they serve.

CHARACTER STABILITY — Maturity in the fruit of the Spirit, particularly self-control and gentleness. Deliverance ministry done in anger, pride, or desperation causes harm.

SCRIPTURAL FOUNDATION — They must understand the legal framework, the hierarchy, and the protocol. Enthusiasm without knowledge is dangerous.

SUBMISSION — They must be submitted to covering — not independent operators. Independent deliverance ministers operating without accountability are prime targets for infiltration.

DISCERNMENT — Not just the desire to cast things out, but the ability to hear the Spirit clearly in a session, to know what they are dealing with, and to know when to stop.`,
      },
      {
        heading: 'Building a Team Culture',
        body: `A healthy deliverance team functions like a special operations unit — high trust, clear roles, mutual submission, and a shared mission.

Key team culture practices:
• Regular team prayer and debrief after sessions — never let the spiritual weight accumulate without processing
• Transparent communication about personal struggles — team members who are carrying unacknowledged warfare become liabilities
• Clear chain of authority — everyone knows who leads, who intercedes, who documents, who handles logistics
• Shared intelligence — what the Spirit is showing in prayer is shared with the team, not hoarded
• Regular team deliverance — the minister is a target; the team should regularly pray over and minister to each other
• Celebration of victories — deliverance ministry deals with heavy things; create rhythms of joy and worship

The team that prays together, fasts together, and celebrates together will sustain the ministry long-term. Individual ministers burn out. Teams endure.`,
      },
    ],
  },
]

function FieldManualPage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [selectedModule, setSelectedModule] = useState<typeof MODULES[0] | null>(null)
  const [progress, setProgress] = useState<Set<string>>(new Set())
  const [savingProgress, setSavingProgress] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showList, setShowList] = useState(true)

  const tier = ((user?.publicMetadata?.tier as string) || 'watchman').toLowerCase()
  const tierLevel = TIER_LEVEL[tier] ?? 0
  const isDark = theme !== 'light'

  const bg     = isDark ? '#0D0B14' : '#faf8f4'
  const surf   = isDark ? 'rgba(201,168,76,0.04)' : '#f0ebe3'
  const surf2  = isDark ? '#16131e' : '#e8e0d4'
  const border = isDark ? 'rgba(201,168,76,0.12)' : 'rgba(160,120,48,0.2)'
  const txt    = isDark ? '#f0e8d8' : '#1a1410'
  const muted  = isDark ? '#8B7355' : '#5c4a3a'
  const gold   = isDark ? G : '#a07830'

  useEffect(() => {
    const saved = localStorage.getItem('wri-theme')
    if (saved === 'light' || saved === 'dark') setTheme(saved as 'dark' | 'light')
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    loadProgress()
  }, [user?.id])

  async function loadProgress() {
    try {
      const token = await getToken()
      const res = await fetch('/api/field-manual-progress', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setProgress(new Set((d.progress || []).filter((p: any) => p.completed).map((p: any) => p.module_id)))
      }
    } catch (e) {}
  }

  async function markComplete(moduleId: string) {
    if (savingProgress) return
    setSavingProgress(true)
    try {
      const token = await getToken()
      await fetch('/api/field-manual-progress', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: moduleId, completed: true }),
      })
      setProgress(prev => new Set([...prev, moduleId]))
    } catch (e) {}
    setSavingProgress(false)
  }

  function hasAccess(moduleTier: string) {
    return tierLevel >= (TIER_LEVEL[moduleTier] ?? 0)
  }

  const tierColors: Record<string, string> = { free: '#9a8c74', soldier: '#7a9e7e', commander: '#8B9DCA', general: '#C9A84C' }
  const tierLabels: Record<string, string> = { free: 'FREE', soldier: 'SOLDIER+', commander: 'COMMANDER+', general: 'GENERAL+' }

  const completedCount = MODULES.filter(m => progress.has(m.id)).length

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, background: isDark ? '#0a0810' : '#f0ebe3', flexShrink: 0 }}>
        <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, color: gold, letterSpacing: '0.1em', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Community
        </a>
        <span style={{ color: border, fontSize: 14 }}>|</span>
        <span style={{ fontFamily: cinzel, fontSize: 10, color: muted, letterSpacing: '0.08em' }}>FIELD MANUAL</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: cinzel, fontSize: 9, color: muted, letterSpacing: '0.08em' }}>
          {completedCount}/{MODULES.length} COMPLETE
        </span>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 49px)' }}>
        {/* Module list sidebar */}
        {(!isMobile || showList) && (
          <div style={{
            width: isMobile ? '100%' : 300, flexShrink: 0,
            borderRight: isMobile ? 'none' : `1px solid ${border}`,
            background: isDark ? '#0a0810' : '#ede6db',
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '24px 20px 16px', borderBottom: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, color: gold, letterSpacing: '0.2em', fontFamily: cinzel, marginBottom: 8 }}>⚔ WAR ROOM INTEL</div>
              <div style={{ fontFamily: cinzel, fontSize: 18, color: isDark ? '#f0e8d8' : '#1a1410', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 6 }}>Field Manual</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: muted, lineHeight: 1.5, marginBottom: 12 }}>
                Foundational doctrine for the spiritual warfare minister
              </div>
              {/* Progress bar */}
              <div style={{ background: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(160,120,48,0.12)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                <div style={{ background: gold, height: '100%', width: `${(completedCount / MODULES.length) * 100}%`, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: muted, letterSpacing: '0.08em', marginTop: 6 }}>
                {completedCount} of {MODULES.length} modules completed
              </div>
            </div>

            {/* Module list */}
            <div style={{ padding: '8px 0', flex: 1 }}>
              {MODULES.map((mod) => {
                const accessible = hasAccess(mod.tier)
                const done = progress.has(mod.id)
                const active = selectedModule?.id === mod.id
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      if (!accessible) return
                      setSelectedModule(mod)
                      if (isMobile) setShowList(false)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '12px 20px',
                      background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
                      border: 'none', borderLeft: `2px solid ${active ? gold : 'transparent'}`,
                      cursor: accessible ? 'pointer' : 'default',
                      textAlign: 'left', opacity: accessible ? 1 : 0.5,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (accessible && !active) (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {/* Number / checkmark */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      border: `1px solid ${done ? gold : border}`,
                      background: done ? gold : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: done ? 12 : 10,
                      color: done ? '#0D0B14' : muted,
                      fontFamily: cinzel, fontWeight: 700,
                    }}>
                      {done ? '✓' : mod.number}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 11, color: active ? gold : (isDark ? '#c8b99a' : '#3d2e1e'), letterSpacing: '0.06em', marginBottom: 2 }}>
                        {!accessible && '🔒 '}{mod.title}
                      </div>
                      <div style={{ fontFamily: crimson, fontSize: 11, color: muted, lineHeight: 1.3 }}>{mod.subtitle}</div>
                    </div>
                    <span style={{
                      fontSize: 8, fontFamily: cinzel, letterSpacing: '0.06em',
                      color: tierColors[mod.tier] || muted,
                      border: `1px solid ${tierColors[mod.tier] || muted}`,
                      borderRadius: 8, padding: '1px 5px', flexShrink: 0,
                    }}>
                      {tierLabels[mod.tier] || mod.tier.toUpperCase()}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Content area */}
        {(!isMobile || !showList) && (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, background: bg }}>
            {!selectedModule ? (
              // Welcome state
              (<div style={{ padding: isMobile ? '24px 20px' : '48px 56px', maxWidth: 720 }}>
                {isMobile && (
                  <button onClick={() => setShowList(true)} style={{ background: 'none', border: 'none', color: gold, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ← All Modules
                  </button>
                )}
                <div style={{ fontSize: 10, color: gold, letterSpacing: '0.2em', fontFamily: cinzel, marginBottom: 12, textTransform: 'uppercase' }}>
                  ✦ Foundational Doctrine
                </div>
                <div style={{ fontFamily: cinzel, fontSize: isMobile ? 22 : 32, color: isDark ? '#f0e8d8' : '#1a1410', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 16, lineHeight: 1.2 }}>
                  The Field Manual
                </div>
                <div style={{ fontFamily: crimson, fontSize: 16, color: txt, lineHeight: 1.8, marginBottom: 32 }}>
                  Seven modules of foundational spiritual warfare doctrine drawn from Pastor Justin's Bootcamp curriculum.
                  Each module builds on the last — work through them in order for the deepest foundation.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                  {MODULES.map(mod => {
                    const accessible = hasAccess(mod.tier)
                    const done = progress.has(mod.id)
                    return (
                      <div
                        key={mod.id}
                        onClick={() => accessible && setSelectedModule(mod)}
                        style={{
                          background: surf, border: `1px solid ${border}`,
                          borderLeft: `3px solid ${done ? gold : (accessible ? border : 'rgba(255,255,255,0.05)')}`,
                          borderRadius: 10, padding: '16px 18px',
                          cursor: accessible ? 'pointer' : 'default',
                          opacity: accessible ? 1 : 0.55, transition: 'border-color 0.15s',
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                        }}
                        onMouseEnter={e => accessible && ((e.currentTarget as HTMLElement).style.borderColor = gold)}
                        onMouseLeave={e => accessible && ((e.currentTarget as HTMLElement).style.borderColor = border)}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{mod.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontFamily: cinzel, fontSize: 9, color: muted, letterSpacing: '0.1em' }}>MODULE {mod.number}</span>
                            {done && <span style={{ fontSize: 10, color: gold }}>✓</span>}
                          </div>
                          <div style={{ fontFamily: cinzel, fontSize: 12, color: txt, letterSpacing: '0.04em', marginBottom: 4 }}>
                            {!accessible && '🔒 '}{mod.title}
                          </div>
                          <div style={{ fontFamily: crimson, fontSize: 12, color: muted, lineHeight: 1.4 }}>{mod.subtitle}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>)
            ) : (
              // Module content
              (<ModuleView
                mod={selectedModule}
                isDark={isDark}
                bg={bg} surf={surf} surf2={surf2} border={border}
                txt={txt} muted={muted} gold={gold}
                isMobile={isMobile}
                hasAccess={hasAccess(selectedModule.tier)}
                completed={progress.has(selectedModule.id)}
                savingProgress={savingProgress}
                onBack={() => { setSelectedModule(null); if (isMobile) setShowList(true) }}
                onMarkComplete={() => markComplete(selectedModule.id)}
                onPrev={() => {
                  const idx = MODULES.findIndex(m => m.id === selectedModule.id)
                  if (idx > 0) setSelectedModule(MODULES[idx - 1])
                }}
                onNext={() => {
                  const idx = MODULES.findIndex(m => m.id === selectedModule.id)
                  if (idx < MODULES.length - 1) setSelectedModule(MODULES[idx + 1])
                }}
                hasPrev={MODULES.findIndex(m => m.id === selectedModule.id) > 0}
                hasNext={MODULES.findIndex(m => m.id === selectedModule.id) < MODULES.length - 1}
                tierColors={{ free: '#9a8c74', soldier: '#7a9e7e', commander: '#8B9DCA', general: '#C9A84C' }}
                tierLabels={{ free: 'FREE', soldier: 'SOLDIER+', commander: 'COMMANDER+', general: 'GENERAL+' }}
                userTier={tier}
              />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ModuleView({
  mod, isDark, bg, surf, surf2, border, txt, muted, gold,
  isMobile, hasAccess, completed, savingProgress,
  onBack, onMarkComplete, onPrev, onNext, hasPrev, hasNext,
  tierColors, tierLabels, userTier,
}: any) {
  const upgradeTier = mod.tier

  return (
    <div style={{ padding: isMobile ? '20px 20px 40px' : '40px 56px 60px', maxWidth: 760 }}>
      {/* Back */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: gold, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← {isMobile ? 'All Modules' : 'Field Manual'}
      </button>
      {/* Module header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28 }}>
        <span style={{ fontSize: 32, flexShrink: 0 }}>{mod.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: cinzel, fontSize: 9, color: muted, letterSpacing: '0.12em' }}>MODULE {mod.number}</span>
            <span style={{ fontSize: 9, fontFamily: cinzel, letterSpacing: '0.06em', color: tierColors[mod.tier] || muted, border: `1px solid ${tierColors[mod.tier] || muted}`, borderRadius: 8, padding: '1px 6px' }}>
              {tierLabels[mod.tier] || mod.tier.toUpperCase()}
            </span>
            {completed && (
              <span style={{ fontFamily: cinzel, fontSize: 9, color: gold, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 3 }}>
                ✓ COMPLETED
              </span>
            )}
          </div>
          <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 24, color: gold, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>{mod.title}</div>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: muted, letterSpacing: '0.08em' }}>{mod.subtitle}</div>
        </div>
      </div>
      {/* Intro */}
      <div style={{ background: surf, border: `1px solid ${border}`, borderLeft: `3px solid ${gold}`, borderRadius: 10, padding: '16px 20px', marginBottom: 32 }}>
        <div style={{ fontFamily: crimson, fontSize: 15, color: isDark ? '#c8b99a' : '#3d2e1e', lineHeight: 1.7, fontStyle: 'italic' }}>
          {mod.intro}
        </div>
      </div>
      {!hasAccess ? (
        // Locked state
        (<div style={{ background: surf, border: `1px solid ${border}`, borderRadius: 12, padding: `40px 32px`, textAlign: `center` }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: gold, letterSpacing: '0.08em', marginBottom: 10 }}>
            {tierLabels[upgradeTier]} Access Required
          </div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: muted, lineHeight: 1.6, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
            This module is available to {upgradeTier.charAt(0).toUpperCase() + upgradeTier.slice(1)} tier members and above.
            Upgrade your membership to unlock this content.
          </div>
          <a
            href="/#pricing"
            style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: gold, padding: '12px 28px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}
          >
            Upgrade Membership
          </a>
        </div>)
      ) : (
        // Full content
        (<>
          {mod.sections.map((section: any, i: number) => (
            <div key={i} style={{ marginBottom: 36 }}>
              <div style={{ fontFamily: cinzel, fontSize: 13, color: gold, letterSpacing: '0.06em', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${border}` }}>
                {section.heading}
              </div>
              <div style={{ fontFamily: crimson, fontSize: 16, color: txt, lineHeight: 1.85, whiteSpace: 'pre-wrap' as const }}>
                {section.body}
              </div>
            </div>
          ))}
          {/* Mark complete */}
          {!completed && (
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={onMarkComplete}
                disabled={savingProgress}
                style={{
                  fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
                  color: '#0D0B14', background: gold,
                  padding: '14px 32px', borderRadius: 4, border: 'none',
                  cursor: savingProgress ? 'default' : 'pointer',
                  opacity: savingProgress ? 0.7 : 1,
                  fontWeight: 700,
                }}
              >
                {savingProgress ? 'Saving...' : '✓ Mark Module Complete'}
              </button>
            </div>
          )}
          {completed && (
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: gold, display: 'flex', alignItems: 'center', gap: 6 }}>
                ✓ MODULE COMPLETE
              </span>
            </div>
          )}
          {/* Prev / Next navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, gap: 12 }}>
            {hasPrev ? (
              <button onClick={onPrev} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: gold, background: 'transparent', border: `1px solid rgba(201,168,76,0.35)`, padding: '10px 20px', borderRadius: 4, cursor: 'pointer' }}>
                ← Previous Module
              </button>
            ) : <div />}
            {hasNext ? (
              <button onClick={onNext} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: gold, background: 'transparent', border: `1px solid rgba(201,168,76,0.35)`, padding: '10px 20px', borderRadius: 4, cursor: 'pointer' }}>
                Next Module →
              </button>
            ) : <div />}
          </div>
        </>)
      )}
    </div>
  )
}
