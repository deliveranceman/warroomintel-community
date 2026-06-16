import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { UpgradeGate } from '@/components/UpgradeGate'
import { useIsDark } from '@/lib/use-is-dark'

const MobileSubpageNav = () => (
  <>
    <style>{`@media(max-width:640px){.wri-subnav{display:flex!important}}`}</style>
    <nav className="wri-subnav" style={{ display:'none', position:'fixed', bottom:0, left:0, right:0, height:'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px))', background:'#0d0b14', borderTop:'1px solid rgba(201,168,76,0.25)', zIndex:200, alignItems:'center', justifyContent:'space-around', paddingLeft:'4px', paddingRight:'4px', paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
      <a href="/community" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:'rgba(201,168,76,0.55)', textDecoration:'none', fontSize:9, fontFamily:'var(--font-label)', letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        HOME
      </a>
      <a href="/community#database" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:'rgba(201,168,76,0.55)', textDecoration:'none', fontSize:9, fontFamily:'var(--font-label)', letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        INTEL
      </a>
      <div style={{ width:44, height:44, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <a href="/community" style={{ color:'#0d0b14', fontSize:18, lineHeight:1, textDecoration:'none', fontFamily:"'Cinzel',serif" }}>⚔</a>
      </div>
      <a href="/community#forum" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:'rgba(201,168,76,0.55)', textDecoration:'none', fontSize:9, fontFamily:'var(--font-label)', letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="2" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        OPS
      </a>
      <a href="/community" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:'rgba(201,168,76,0.55)', textDecoration:'none', fontSize:9, fontFamily:'var(--font-label)', letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        AI
      </a>
    </nav>
  </>
)

export const Route = createFileRoute('/community_/field-manual')({
  ssr: false,
  component: () => <><FieldManualPage /><MobileSubpageNav /></>,
})

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const G      = '#C9A84C'
const BG     = '#0D0B14'
const SURF   = '#12101e'
const SURF2  = '#1a1726'
const BDR    = 'rgba(201,168,76,0.22)'
const TXT    = '#e8dcc8'
const DIM    = '#a09080'
const MUT    = '#6b5e45'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_LEVELS: Record<string, number> = { watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 4 }

// ── MODULE DATA ────────────────────────────────────────────────────────────────

interface Section { heading: string; body: string; scripture?: string }
interface Module {
  id: string; number: number; icon: string; title: string
  intro: string; tier: 'free' | 'soldier'; sections: Section[]
}
interface Article { id: string; title: string; pages: string; intro: string; sections: { heading: string; body: string; scripture?: string }[]; takeaway: string }

const DOCTRINE_MODULES: Module[] = [
  {
    id: 'what-is-warfare', number: 1, icon: '⚔', tier: 'free',
    title: 'What Is Spiritual Warfare',
    intro: 'Heaven is a spiritual dimension, not a physical place. The cosmic conflict between God\'s will and evil is not a movie — it is the context in which every believer lives every day.',
    sections: [
      {
        heading: 'The Nature of the Conflict',
        scripture: 'Ephesians 6:12 — "For we wrestle not against flesh and blood, but against principalities, against powers, against the rulers of the darkness of this world, against spiritual wickedness in high places."',
        body: `Spiritual warfare is the conflict between God's perfect plan and evil's attempt to destroy what God loves. It is not a conflict between equals — God has no equal. It is a conflict between the Creator's declared purpose and a defeated enemy's last-ditch resistance.

When Jesus died on the Cross, He won the war. What we engage in today is not a war to determine the victor — that has already been settled. We are enforcing a victory already won.

This distinction matters. A soldier who does not know the war is over fights differently than one who does. We fight from victory, not toward it. The posture of the spiritual warrior is not desperation — it is enforcement.`,
      },
      {
        heading: 'The Cosmic Stakes',
        scripture: 'Mark 10:45 — "For even the Son of Man did not come to be served, but to serve, and to give His life a ransom for many."',
        body: `The stakes in spiritual warfare are the souls and destinies of human beings — the objects of God's love and the target of the enemy's hatred. The enemy does not hate you primarily — he hates God, and you bear God's image. That is why you are a target.

Understanding the "why" of the conflict changes how you engage. You are not fighting because you are in danger. You are fighting because others are. The warrior in spiritual warfare carries the burden of those who cannot yet fight for themselves.`,
      },
      {
        heading: 'Field Note — The Goal',
        body: `The goal of spiritual warfare is not survival. It is not maintenance. It is not even deliverance — though deliverance is part of it.

The goal is the establishment of God's kingdom in human lives, families, communities, and regions. The warfare is simply the resistance that must be overcome to get there.

A soldier who only fights when attacked is not winning ground — he is holding ground. The spiritual warrior is called to advance.`,
      },
    ],
  },
  {
    id: 'angelic-realm', number: 2, icon: '✦', tier: 'free',
    title: 'The Angelic Realm',
    intro: 'Angels are not the chubby, harp-playing figures of greeting cards. They are created beings of immense power and function, organized into a hierarchy that mirrors the authority structure of God\'s kingdom.',
    sections: [
      {
        heading: 'Three Spheres of Angels',
        body: `The angelic hierarchy is organized into three spheres of increasing proximity to God's throne and decreasing positional authority.

**First Sphere** — Closest to God's throne, highest function:
- **Seraphim** — the burning ones, continual worshipers before God (Isaiah 6)
- **Cherubim** — guardians of God's holiness, bearers of His presence (Ezekiel 1, Genesis 3)
- **Thrones** — celestial courts, associated with divine justice and judgment

**Second Sphere** — Administrative and governmental:
- **Dominions** — govern and direct the lesser orders
- **Virtues** — associated with miracles, signs, and the movement of God's power
- **Powers** — bear authority over nations and cosmic order

**Third Sphere** — Closest to the human realm, most active in earthly affairs:
- **Principalities** — assigned governance over nations and regions
- **Archangels** — highest-ranking among the third sphere; Michael and Gabriel are named
- **Angels** — messengers and ministers to God's people (Hebrews 1:14)`,
      },
      {
        heading: 'The Three Named Angels',
        scripture: '2 Peter 2:11 — "Angels, which are greater in power and might" than fallen powers.',
        body: `Three angels are named in Scripture, each carrying a distinct function:

**Michael** — The warrior archangel. His name means "Who is like God?" — a declaration, not a question. Michael leads God's armies, contends with territorial princes (Daniel 10), and is associated with the defense and deliverance of God's people. Jude 9 records his contention with Satan over the body of Moses. Revelation 12 records his war against the dragon.

**Gabriel** — The messenger archangel. His name means "Man of God" or "God is my strength." Gabriel delivers God's most significant revelatory announcements: to Daniel (Daniel 8-9), to Zacharias announcing John the Baptist (Luke 1), and to Mary announcing the Incarnation (Luke 1). He is the herald of God's redemptive plan.

**Lucifer** — The fallen worship leader. Created as the highest of created beings, assigned to lead heaven's worship. His name means "Light-bearer." His fall is recorded in Isaiah 14 and Ezekiel 28. He is now the adversary — Satan — the accuser of the brethren (Revelation 12:10).`,
      },
      {
        heading: 'Field Note — Understanding the Mirror',
        body: `The enemy did not create his own system — he corrupted the one he fell from. The hierarchy of darkness mirrors the hierarchy of heaven that Lucifer once inhabited.

Principalities mirror the governmental angels of the Third Sphere. Powers mirror the Powers of the Second Sphere. Rulers of darkness mirror the Dominions. This is not coincidence — it is the architecture of a counterfeiter.

Understanding the angelic order gives you context for the ranks of darkness you face in ministry. You are not fighting random chaos — you are facing a structured, organized system that mimics the order it abandoned.`,
      },
    ],
  },
  {
    id: 'natural-vs-spiritual', number: 3, icon: '🔍', tier: 'free',
    title: 'Natural vs Spiritual',
    intro: 'One of the most critical skills in spiritual warfare is knowing what you are actually dealing with. Not everything is demonic. Not everything is natural. The failure to distinguish between the two causes catastrophic ministry errors.',
    sections: [
      {
        heading: 'Two Errors to Avoid',
        body: `**Error 1: Spiritual Numbness** — treating everything as natural when some things are spiritual in origin. This error produces ineffective ministry, counseling solutions where deliverance is needed, and a community that is constantly under attack without understanding why.

**Error 2: Spiritual Hyperactivity** — treating everything as demonic when some things are natural, medical, or relational. This error produces paranoia, false diagnoses, unnecessary trauma to hurting people, and a ministry environment that feels more like a horror film than a healing room.

The mature minister walks the narrow road between these two errors. She does not dismiss the supernatural, nor does she invoke it at every turn. She asks the right question: *What is the source of what I am seeing?*`,
      },
      {
        heading: 'A Practical Framework for Testing',
        scripture: '1 John 4:1 — "Beloved, do not believe every spirit, but test the spirits to see whether they are from God."',
        body: `When you encounter a presenting issue — a physical symptom, a behavioral pattern, an emotional struggle — ask these questions in order:

**1. Is there a natural explanation?** Medical conditions are real. Trauma responses are real. Mental health challenges are real. Hormonal imbalances, sleep deprivation, grief, and poverty all produce symptoms that can look spiritual.

**2. Has natural treatment been pursued?** If someone has never seen a doctor for symptoms that have a potential medical cause, send them first. Deliverance does not replace medicine.

**3. Is there a pattern of generational recurrence?** When the same issue runs in bloodlines — addiction, rage, certain illnesses, sexual sin patterns — the generational signature points to a spiritual component.

**4. Does prayer and repentance produce temporary relief that evaporates without structural change?** This is a strong indicator of spiritual roots.

**5. Does the person's spirit respond to the things of God or resist them?** A demonized person often exhibits an aversion to genuine worship, prayer, Scripture, or the name of Jesus that goes beyond normal discomfort.`,
      },
      {
        heading: 'Field Note — Discernment Is the Difference',
        body: `Not everything is a demon. Not everything is natural. Discernment is the difference — and discernment is not optional equipment for the spiritual warrior. It is standard issue.

The gift of discerning of spirits (1 Corinthians 12:10) is a supernatural gift available to every Spirit-filled believer. But discernment also has an observational dimension that is developed through experience, study, and relationship with God.

Ask the Holy Spirit before every ministry encounter: *What am I dealing with?* He will tell you. And He will be right.`,
      },
    ],
  },
  {
    id: 'the-fall', number: 4, icon: '🔥', tier: 'free',
    title: 'The Fall — How Evil Entered',
    intro: 'Before we can understand how to fight evil, we must understand how it entered. The origin of evil is not a mystery — it is documented in Scripture with enough detail to explain everything that follows.',
    sections: [
      {
        heading: 'Free Moral Agents',
        body: `God created angels, and later humans, as free moral agents. This means they possessed genuine choice — the real capacity to align with God's will or to choose against it.

This is not a design flaw. It is the prerequisite for love. Love cannot be coerced. A being who has no choice but to obey is not worshipping — it is functioning like a machine. God wanted worshippers, not machines.

The power of choice means that the capacity for good and the capacity for evil coexist in free moral agents. God did not create evil. He created beings capable of choosing it — and the choice was theirs.`,
      },
      {
        heading: 'The Moment of the Fall',
        scripture: 'Isaiah 14:12-14 — "I will ascend into heaven, I will exalt my throne above the stars of God... I will be like the most High."',
        body: `At some point prior to the creation of the world, Lucifer — the highest created being, the worship leader of heaven — made a choice. He chose his own will over God's will. That choice introduced evil into the universe.

The declaration in Isaiah 14 is repeated five times: "I will." Five declarations of self-will against divine will. The root of sin is not rebellion for its own sake — it is SELFISHNESS. The elevation of self above God and above others.

This is why the Cross works the way it does. Jesus is the inverse of Lucifer. Where Lucifer declared "I will ascend," Jesus descended. Where Lucifer said "I will exalt my throne," Jesus took the form of a servant. Where Lucifer said "I will be like the Most High," Jesus, being equal with God, emptied Himself (Philippians 2:6-8). The Cross is the reversal of the Fall.`,
      },
      {
        heading: 'Field Note — Why Deliverance Works',
        body: `Understanding the origin of evil clarifies why deliverance works — and why it is not optional for the Church.

Lucifer's choice was judged at the Cross. The verdict is not pending — it was rendered. "The ruler of this world is judged" (John 16:11). The enemy operates on borrowed time, in borrowed territory, with borrowed authority that he stole through deception.

When we engage in deliverance ministry, we are not struggling against a power equal to ours. We are enforcing the verdict of a court that already ruled. The Judge has spoken. We are the marshals.

The enemy knows his sentence. He is fighting not to win — he cannot win — but to take as many casualties as possible before the final judgment. Understanding this changes your posture. You do not beg a defeated enemy to leave. You enforce a verdict already handed down.`,
      },
    ],
  },
]

const ENEMY_MODULES: Module[] = [
  {
    id: 'signs-symbols', number: 5, icon: '👁', tier: 'soldier',
    title: 'Signs, Symbols & Occult Gateways',
    intro: 'The enemy operates counterfeits of God\'s order. Symbols, holidays, objects, and practices can carry genuine spiritual weight — either as open doors or as indicators of the enemy\'s territory in a person\'s history.',
    sections: [
      {
        heading: 'The Counterfeiting Strategy',
        scripture: '2 Corinthians 11:14 — "And no wonder, for Satan himself masquerades as an angel of light."',
        body: `The enemy does not primarily operate through obvious darkness. He operates through counterfeits — imitations of the genuine that are designed to capture those who are hungry for the real.

Every occult system is a counterfeit of something genuine:
- Divination counterfeits prophecy
- Astrology counterfeits the discernment of times and seasons
- Mediumship counterfeits communication with God
- Witchcraft counterfeits the miraculous power of the Holy Spirit
- Secret societies counterfeit covenant community

The pattern is consistent: take a real hunger, provide a dark substitute, attach spiritual bondage to the transaction.`,
      },
      {
        heading: 'Common Occult Gateways in Ministry Context',
        body: `In deliverance ministry, certain categories of background information consistently correlate with specific types of demonic access:

**Generational occult involvement** — Freemasonry, Eastern Star, Odd Fellows, Shriners, and similar fraternal orders involve oaths sworn to unnamed deities and ceremonies that mock the sacraments of Christ. These create strong generational assignments.

**Active occult practice** — Tarot, Ouija boards, witchcraft, Wicca, Santería, voodoo, and similar practices constitute direct invitations to demonic access.

**New Age practices** — Reiki, energy work, crystal healing, past-life regression, and channeling are often presented as spiritually neutral but involve direct contact with spirit entities not of God.

**Occult objects** — Items consecrated to false deities, ritual objects, charms, and some cultural artifacts carry spiritual attachment and should be removed and destroyed (Acts 19:19).

**Entertainment and media** — Prolonged immersion in occult media, horror, or spiritually dark content is not the same as active practice, but it opens the mind and can create spiritual desensitization.`,
      },
      {
        heading: 'Field Note — Know Enough, Not Everything',
        body: `You do not need to become an expert in darkness to recognize an open door. The minister who spends years cataloguing every occult system becomes vulnerable to what he studies and loses perspective.

Know enough to recognize the category. Know that Freemasonry creates generational assignments. Know that occult sexual rituals create strong soul ties. Know that objects consecrated to other deities need to go. You do not need the detailed theology of every cult or the rank structure of every occult lodge.

Ask the Holy Spirit what He wants you to know in the session. He will bring to light what needs light. He will not ask you to go digging in darkness alone.`,
      },
    ],
  },
  {
    id: 'types-of-bondage', number: 6, icon: '⛓', tier: 'soldier',
    title: 'Types of Bondage',
    intro: '"Anything meant to hold you close to the world, tie you to Satan, keep you from God — that is bondage." Bondage is not always dramatic. Most people who come for ministry are bound by shame, patterns, and agreements, not Hollywood possession.',
    sections: [
      {
        heading: 'The Spectrum of Bondage',
        scripture: 'Isaiah 61:1 — "The Spirit of the Lord God is upon me... to proclaim liberty to the captives, and the opening of the prison to those who are bound."',
        body: `Bondage exists on a spectrum from mild to severe. Understanding the spectrum prevents both under-treatment and over-diagnosis.

**Worldly Attachment** — The lowest level: patterns of thinking, behaving, and relating that are shaped more by the world's system than by the Kingdom. The person is not demonized but is operating according to ungodly frameworks. Discipleship and renewing of the mind address this level.

**Sin Patterns** — Recurring cycles of specific sin that persist despite genuine desire to stop. The person wants to be free but cannot break the cycle through willpower. This often has a spiritual root that needs to be addressed.

**Oppression** — External demonic pressure on a person's life: financial destruction, relationship fracture, illness patterns, accidents, and persistent spiritual attack that cluster around a person. The person is not demonized but is under assignment.

**Demonization** — Internal demonic presence: a spirit has established legal ground and taken residence. This ranges from mild influence in specific areas to stronger manifestation in multiple areas.`,
      },
      {
        heading: 'What Bondage Is Not',
        body: `Clarity on what bondage is NOT prevents harmful ministry errors:

**Bondage is not weakness** — A person in significant bondage may be a genuine believer, a faithful church member, a person of prayer. The presence of bondage does not reflect the absence of faith.

**Not every struggle is bondage** — The normal human experience includes temptation, grief, disappointment, and growth pains. Not every difficult season is a demonic attack.

**Demonization is not possession in the Hollywood sense** — "Possession" implies total control. Most demonized people function normally in most areas of life and have localized areas of demonic influence.

**Bondage is not permanent** — There is no bondage too deep for the power of the Cross. The enemy wants you to believe some situations are irreversible. They are not.`,
      },
      {
        heading: 'Field Note — Most People Are Not Who You Think',
        body: `Most people in your ministry sessions are not coming to you because they saw furniture move or heard voices. They are coming because they cannot stop drinking. Because their marriage is destroying itself by a force they do not understand. Because the same pattern of financial destruction runs in every generation of their family. Because they cannot feel God no matter how hard they try.

These are bondage presentations. They are real. They are spiritual in significant part. And they respond to deliverance ministry when the legal ground is addressed and the spirits are properly evicted.

Do not screen people out because they are "not dramatic enough." The quiet sufferer has been waiting for someone to tell him that there is a name for what has been happening to him — and that the Cross already paid for his freedom.`,
      },
    ],
  },
  {
    id: 'red-flags-detection', number: 7, icon: '🎯', tier: 'soldier',
    title: 'Red Flags & Detection',
    intro: 'Two methods exist for identifying demonic activity: Discernment — a supernatural gift — and Detection — a learned observational skill. Every minister needs both.',
    sections: [
      {
        heading: 'Discernment — The Supernatural Gift',
        scripture: '1 Corinthians 12:10 — "To another the discerning of spirits."',
        body: `The gift of discerning of spirits is a specific gift of the Holy Spirit listed among the gifts in 1 Corinthians 12. It gives the believer supernatural perception of the spiritual realm — the ability to sense the presence and nature of spirits, to know what is operating in a room or a person, and to distinguish between what is of God and what is not.

This gift operates differently in different ministers. For some it is primarily sensory — physical sensations that correspond to spiritual realities. For others it is primarily visual — seeing in the spirit realm. For others it is primarily cognitive — a sudden knowing.

The gift is not the result of experience or education. It is a grace gift given by the Spirit as He wills (1 Corinthians 12:11). But it can be exercised more fluently as the believer grows in intimacy with God and sensitivity to the Spirit.`,
      },
      {
        heading: 'Detection — The Observational Skill',
        body: `Detection is the learned ability to observe patterns, behaviors, and histories that indicate demonic activity. It is not supernatural — it is applied wisdom and pattern recognition built through experience.

**Behavioral red flags in a ministry setting:**
- Sudden change in voice, posture, or facial expression during prayer
- Extreme aversion to the name of Jesus, the blood, or the Cross — disproportionate to religious background
- Physical symptoms that appear specifically during worship or prayer (nausea, shaking, choking)
- Eyes that shift, glaze, or show unusual dilation
- Sudden extreme fatigue or desire to leave during spiritual engagement
- Laughter that is inappropriate and disconnected from emotional context

**Historical red flags in intake:**
- Significant occult background (self or generational)
- Repeated cycles of the same failure pattern across years despite genuine effort to stop
- Consistent trauma history with no breakthrough despite significant counseling
- Unexplained physical symptoms that medicine cannot diagnose
- Persistent inability to sense God or engage in genuine prayer despite desire to do so`,
      },
      {
        heading: 'Field Note — Both Are Required',
        body: `Discernment without detection produces a minister who trusts impressions without observation — vulnerable to emotional manipulation and personal projection.

Detection without discernment produces a minister who makes clinical lists but cannot hear the Spirit tell him what he is actually dealing with.

The mature minister uses both simultaneously. He observes what is happening in the natural. He asks the Spirit what is happening in the spiritual. He holds both until they align. And when they align, he moves with confidence.

Discernment is a gift. Detection is a discipline. Every minister needs both. And neither is a substitute for the other.`,
      },
    ],
  },
]

const AUTHORITY_MODULES: Module[] = [
  {
    id: 'authority', number: 8, icon: '✦', tier: 'soldier',
    title: 'Authority — How I Fight My Battles',
    intro: 'Authority is only as good as what empowers it. A badge with no backing is a prop. Our authority in spiritual warfare derives from Christ — not from rank, title, experience, or volume.',
    sections: [
      {
        heading: 'The Source of Authority',
        scripture: 'Matthew 28:18-20 — "All authority in heaven and on earth has been given to me. Therefore go..."',
        body: `The authority we carry in spiritual warfare is delegated authority. Jesus did not give us authority from Himself — He gave us His authority through Himself. This is a critical distinction.

We do not generate spiritual authority. We do not earn it through years of ministry. We do not accumulate it through fasting or sacrifice. We receive it as a gift by virtue of our union with Christ.

This means our authority is as strong on day one as on day ten thousand — because it is His, not ours. A new believer walking in full identity has the same delegated authority as a fifty-year veteran. The difference is often in clarity, experience, and spiritual maturity — not in the authority itself.`,
      },
      {
        heading: 'The Name of Jesus — Not a Formula, a Verdict',
        scripture: 'Luke 10:19 — "I have given you authority to trample on snakes and scorpions and to overcome all the power of the enemy."',
        body: `The name of Jesus carries all authority in heaven and on earth. When we invoke His name, we are not using a magic formula — we are citing a legal verdict issued at the Cross.

The seven sons of Sceva tried to invoke "the Jesus whom Paul preaches" and were beaten and chased out naked (Acts 19:13-16). The demon said: "Jesus I know, and Paul I know — but who are you?" The authority was rejected because they had no relationship, no covenant, and no standing before God.

You do not use the name of Jesus. You stand in the name of Jesus — because you are in covenant with Him, united with Him, and bearing His delegated authority as His representative.

The difference between a minister who commands with the name of Jesus and gets results, and one who uses the same words and gets none, is not the name — it is the relationship and the standing.`,
      },
      {
        heading: 'Field Note — You Do Not Argue, You Enforce',
        body: `You do not argue with the enemy. You do not negotiate. You do not beg. You enforce.

A law enforcement officer does not ask a fugitive to please consider complying with the warrant. He presents the warrant and enforces it with the authority backing him.

The Cross is the warrant. The name of Jesus is the credential. The authority of God is the backing. When you command a spirit to leave in the name of Jesus, you are not hoping it will listen — you are enforcing a verdict already handed down by the highest court in the universe.

This is not arrogance. It is the posture of a representative who knows his authority is real and his warrant is valid.`,
      },
    ],
  },
  {
    id: 'discernment-weapon', number: 9, icon: '🔍', tier: 'soldier',
    title: 'Discernment — How I Fight My Battles',
    intro: 'The Body of Christ has largely lost its spiritual common sense. Discernment is not a special ability reserved for elite believers — it is standard issue for the born-again, Holy Ghost-filled minister who stays close to God.',
    sections: [
      {
        heading: 'What Discernment Is',
        body: `Discernment is the capacity to distinguish — between truth and error, between what is of God and what is not, between the Spirit's movement and a counterfeit.

Hebrews 5:14 describes it as a faculty developed through training and practice: "But solid food is for the mature, who by constant use have trained themselves to distinguish good from evil." The original Greek word for "trained" is the same root as the English word "gymnasium" — deliberate, repeated exercise.

Discernment is not primarily a feeling — though it often comes through a feeling. It is not primarily a thought — though it comes through cognition. It is a perception of spiritual reality made available to the believer by the indwelling Holy Spirit, sharpened through intimacy with God and the consistent study of Scripture.`,
      },
      {
        heading: 'How to Grow the Gift',
        scripture: '1 Thessalonians 5:21 — "Test everything; hold fast what is good."',
        body: `Discernment grows through four practices:

**1. Stay in the Word** — The most reliable form of discernment is the ability to measure what you encounter against the unchanging standard of Scripture. A minister who does not know the Word will be fooled by anything that sounds spiritual. "Your word is a lamp to my feet" (Psalm 119:105).

**2. Stay in intimacy with the Spirit** — The Holy Spirit knows all things. He will tell you what you need to know if you listen. But listening requires quiet — internal quiet — the capacity to hear the still, small voice above the noise of ministry and emotion.

**3. Test everything, especially yourself** — The most dangerous errors in discernment come from confusing your own thoughts, impressions, and projections with what the Spirit is saying. Ask: "Is this consistent with Scripture? Is this motivated by love? Would this produce freedom or fear?"

**4. Practice in community** — Discernment exercised alone, without accountability or correction, drifts toward error. Prophetic words tested by a team of mature believers are more reliable than impressions held privately.`,
      },
      {
        heading: 'Field Note — Build It Like a Muscle',
        body: `Discernment grows like a muscle. You do not build it by thinking about it. You build it by using it — and by being willing to be wrong while you are learning.

The minister who never ventures a discernment call because he is afraid of being wrong will never develop the gift. The minister who ventures discernment calls, submits them to accountability, notes when he was right and when he was wrong, and asks the Spirit to sharpen him — that minister grows.

Stay in intimate relationship with the One who knows all things. He is not hiding information from you. He is waiting for you to draw close enough to hear it.`,
      },
    ],
  },
  {
    id: 'closing-gateways', number: 10, icon: '🚪', tier: 'soldier',
    title: 'Closing Spiritual Gateways',
    intro: '"Neither give place to the devil" (Ephesians 4:27). Every demonic foothold began as an open door. Every open door can be closed. The work of closing gateways is not optional maintenance — it is the structural work that makes deliverance hold.',
    sections: [
      {
        heading: 'How the Enemy Gains Legal Access',
        scripture: 'Ephesians 4:27 — "Neither give place to the devil."',
        body: `The Greek word translated "place" in Ephesians 4:27 is topos — a physical location, a territory, a legally occupied space. The command is: do not give the enemy a legal place in your life.

The enemy does not gate-crash. He enters through doors. Every door is a legal right — a specific sin, agreement, vow, trauma, or ancestral pattern that gave him access. And because God is just, access granted by a legal right can only be permanently revoked by closing that legal right.

Common categories of open doors:
**Sin** — Persistent, unrepented sin in specific areas creates habitual access.
**Trauma** — Severe or repeated trauma creates spiritual vulnerability that can be exploited.
**Agreements** — Spoken or believed lies about yourself, God, or others that you have come into agreement with.
**Objects** — Items with spiritual consecration to other systems.
**Ancestry** — Generational sin that has not been renounced creates inherited assignment.`,
      },
      {
        heading: 'The Process of Closing Doors',
        body: `Closing a spiritual gateway is a legal process with spiritual force. It has four steps:

**1. Identification** — Through prayer, intake, and the Spirit's leading, identify the specific gateway: what is it, when did it open, and what has been accessing through it?

**2. Repentance and Renunciation** — The person verbally repents of the specific sin or involvement and renounces any agreement made with the enemy through it. This must be spoken — not just thought. The spirit realm operates on words. Declarations have force.

**3. Forgiveness** — If another person is involved in the open door (abuse, betrayal, ungodly soul tie), the person must release forgiveness. Unforgiveness is the most common reason deliverance does not hold. Matthew 18:34-35 is not metaphorical — the tormentors that come through unforgiveness are real.

**4. Closure and Consecration** — Declare the door closed in the name of Jesus. Plead the blood of Jesus over the access point. Declare the space now consecrated to God.`,
      },
      {
        heading: 'Field Note — From Pastor Justin\'s Sermon',
        body: `"The devil doesn't want you to hear this. Pray for strength and revelation before you go deeper into this content. The enemy knows that a minister who understands gateways is one he cannot play games with."

The work of closing gateways is not glamorous. It is not dramatic, usually. It is methodical, legal, and permanent — when done correctly.

The minister who masters this step will find that the eviction commands that follow become almost anti-climactic. The spirit has no more legal standing. It is already defeated. You are simply serving the notice.

The gate that is closed stays closed — as long as the person maintains the walk of freedom. That is why post-deliverance discipleship is not optional. Closing the door is one thing. Keeping it closed requires a changed life.`,
      },
    ],
  },
]

const FIELD_NOTES: Article[] = [
  {
    id: 'prelude-to-a-battle',
    title: 'Prelude to a Battle',
    pages: 'Session 1',
    intro: 'Before the battle is the preparation. Every significant spiritual engagement is preceded by a season of alignment — alignment with God, with your team, with the assignment. This session establishes the foundation.',
    sections: [
      {
        heading: 'Why Preparation Matters',
        scripture: 'Luke 14:31 — "What king, going out to wage war against another king, will not sit down first and consider whether he is able with ten thousand to meet him who comes against him with twenty thousand?"',
        body: `Jesus used military language to describe spiritual readiness. The king who goes to battle without counting the cost does not exhibit faith — he exhibits foolishness. Preparation is not the opposite of faith. It is the infrastructure faith operates through.

In spiritual warfare, preparation involves:
- Personal alignment with God: Is there unconfessed sin, unresolved offense, or spiritual depletion in the minister?
- Team preparation: Is the team in agreement, covered in prayer, and clear on the assignment?
- Intelligence gathering: Do we understand what we are walking into?

The warrior who skips preparation does not shortcut the process — he simply encounters the resistance unprepared.`,
      },
      {
        heading: 'The State of the Church',
        body: `The Church in the Western world largely does not know what it is doing in the spirit realm. This is not a condemnation — it is an observation. Generations of cessationist theology, comfort Christianity, and therapeutic ministry have produced a Church that is fully equipped for counseling but largely unequipped for combat.

The people sitting in your sessions have often been in therapy for years. They have confessed the same sin cycles to the same pastor a hundred times. They have white-knuckled their way through sobriety programs and failed. They have prayed the same prayer over their marriage and watched it die anyway.

They are not coming to you for more advice. They are coming because they are at the end of the natural. They need someone who can operate in the supernatural.

You are that person. Whether you feel like it or not.`,
      },
      {
        heading: 'Getting Ready to Fight',
        body: `Before you step into any ministry environment — whether a one-on-one session or a large deliverance meeting — take the following seriously:

**Your Personal Holiness** — The enemy will use what you have not addressed in your own life as leverage. You do not need to be perfect. You need to be current. Deal with what is between you and God before you deal with what is between someone else and the enemy.

**Your Covering** — Who is praying for you? Who knows you are going into ministry today? Who will debrief with you afterward? A minister with no covering is a minister walking a tightrope without a net.

**Your Expectation** — Go expecting God to show up. Not hoping He will. Expecting. Cynicism is a ministry killer. God delights in delivering His people. He wants to show up more than you want Him to.`,
      },
    ],
    takeaway: 'The battle is won before it is fought — in the preparation. Get right, get covered, get your expectation aligned with what God has already said He will do. Then show up.',
  },
  {
    id: 'the-edge',
    title: 'The Edge',
    pages: 'Session 2',
    intro: 'What separates the minister who sees consistent breakthrough from the one who doesn\'t? It is not anointing, talent, or years of experience. It is the willingness to go further than comfort allows.',
    sections: [
      {
        heading: 'Defining the Edge',
        body: `"The Edge" is the place where your faith is required to function beyond your experience. It is where what you know is not enough and what you trust must carry you.

Every significant breakthrough in ministry happened at someone's Edge. Peter did not walk on calm water from the shore. He walked on storm water, from a boat, at the invitation of Jesus. His Edge was the moment his foot left the boat.

The minister who never reaches his Edge never tests his faith in ways that produce growth. He ministers safely, within what he has already seen, and is surprised when the outcomes are what he has always seen.`,
      },
      {
        heading: 'The Enemy of the Edge — Comfort',
        scripture: 'Joshua 1:9 — "Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go."',
        body: `The enemy of the Edge is not fear — though fear is its frequent companion. The enemy of the Edge is comfort.

The comfortable minister does not go into hard sessions. He does not pursue training that challenges his theological assumptions. He does not volunteer for the difficult cases. He ministers within his comfort range, which grows smaller with each year he refuses to be stretched.

God's command to Joshua — "Be strong and courageous" — was not a pep talk. It was a command. Courage is not the absence of fear. It is the decision to move forward in the presence of fear, anchored to the reality that God is with you.`,
      },
      {
        heading: 'Going Deeper Without Going Dark',
        body: `There is a kind of "going deeper" that is actually going darker — the minister who pursues esoteric knowledge about demonic ranks, who seeks to know the enemy more thoroughly than he knows God, who becomes fascinated by darkness under the guise of spiritual warfare research.

This is not the Edge. This is a ditch.

The Edge God calls us to is the Edge of our dependence on Him — going to places where we need Him so completely that we will not survive without His presence. It is not about knowing more about darkness. It is about trusting God more completely in the presence of darkness.

Go deeper into the Word. Go deeper into prayer. Go deeper into intercession. Go deeper into the lives of broken people who need the power of God. That is the Edge that produces breakthrough.`,
      },
    ],
    takeaway: 'The Edge is not a place of danger — it is a place of encounter. Every minister who has ever seen the impossible happen found God at the Edge of their own capability. Go there.',
  },
  {
    id: 'authority-sermon',
    title: 'Authority',
    pages: 'Session 3',
    intro: 'Authority in spiritual warfare is not about volume, emotion, or spiritual aggression. It is about knowing who you are, whose you are, and what has already been established in the spirit realm on your behalf.',
    sections: [
      {
        heading: 'The Verdict Is In',
        scripture: 'Colossians 2:15 — "Having disarmed the powers and authorities, He made a public spectacle of them, triumphing over them by the cross."',
        body: `The Cross was not the low point of Christ's ministry — it was the apex of it. At the Cross, the enemy was disarmed, the powers and authorities were stripped of their dominion, and the verdict against humanity was reversed.

"Having made a public spectacle of them" — this is the language of a Roman triumph. When a Roman general returned from victory, he would parade the defeated kings and generals through the streets in chains, as a public declaration that the war was over and the victor was established.

The Cross was that parade. The principalities and powers were paraded in defeat, before all of heaven and earth, at the moment they thought they had won. The resurrection sealed the verdict.

You fight from that verdict. You do not fight toward it.`,
      },
      {
        heading: 'Why Some Ministers Have It and Some Don\'t',
        body: `Walk into any gathering of people who call themselves deliverance ministers and you will quickly observe a difference. Some command and things happen. Others command with equal volume and equal sincerity and nothing happens.

The difference is not talent. It is not anointing in some mystical, untouchable sense. The difference is this: *the ones who get results actually believe what they are saying.*

They believe in the authority of the name of Jesus not as a theological proposition but as a present operational reality. They believe that the spirit realm responds to them because they have settled in their heart who they are in Christ. They do not beg. They do not perform. They enforce.

You can have this. It is available to every believer. But it requires settling the question of your identity before you are in the session — not during it.`,
      },
      {
        heading: 'Practical: Walking in Authority Daily',
        body: `Authority in ministry flows from authority in life. The minister who submits to God's authority in his marriage, his finances, his disciplines, and his secret life carries genuine spiritual authority when he stands over a demonized person.

The minister who compartmentalizes — who walks in rebellion in private and tries to enforce the Kingdom in public — is building a ministry on sand. The enemy knows the difference. The people in your sessions may not — but the spirits do.

Daily maintenance of your authority:
- Start each day with a declaration of your identity in Christ
- Address sin quickly — do not let it accumulate
- Stay under genuine spiritual covering and accountability
- Walk in forgiveness; offense neutralizes authority faster than almost anything else
- Feed your spirit more than your soul — spend more time in worship and the Word than in ministry reading`,
      },
    ],
    takeaway: 'You carry real authority — not because you are special, but because you are His. Live accordingly in private and it will show in public. The authority you walk in daily is the authority you will have in the session.',
  },
  {
    id: 'discernment-sermon',
    title: 'Discernment',
    pages: 'Session 4',
    intro: 'Discernment is not rare. It is not complicated. It is the natural fruit of a life lived in close relationship with the God who knows all things. The reason the Church has so little of it is not that God is stingy — it is that we have not asked, and we have not trained.',
    sections: [
      {
        heading: 'We Have Lost Our Spiritual Common Sense',
        body: `Spiritual common sense — the basic ability to recognize what is of God and what is not, what is a natural struggle and what is a demonic attack, what is the Holy Spirit and what is a counterfeit — used to be assumed in the Church.

It is no longer.

Several generations of theology that denied the supernatural activity of God, coupled with a therapeutic model of ministry that prioritizes psychology over power, have produced a Church that is spiritually near-sighted. We can see the natural clearly. We can barely see the spiritual at all.

This is not acceptable. We are in a war. A soldier who cannot see the enemy is not a ready soldier. Discernment is not a luxury — it is a necessity.`,
      },
      {
        heading: 'The Gift is Available',
        scripture: '1 John 2:27 — "But the anointing that you received from him abides in you, and you have no need that anyone should teach you. But as his anointing teaches you about everything..."',
        body: `The gift of discernment is not reserved for a spiritual elite. It is available to every born-again, Spirit-filled believer as a function of the anointing that abides within them.

The Holy Spirit who lives in you is omniscient. He knows what every spirit is, what every situation contains, and what every person needs. The question is not whether He has information for you — He always does. The question is whether you have cultivated the quiet and the intimacy to receive it.

Discernment is learned not by seeking experiences but by seeking God. As you draw closer to the One who discerns all things, His discernment begins to operate more freely through you.`,
      },
      {
        heading: 'What Blocks Discernment',
        body: `Understanding what blocks discernment is as important as knowing how to develop it.

**Unconfessed sin** — Sin creates spiritual static. It does not eliminate the Holy Spirit's presence, but it significantly impairs the clarity of His communication.

**Offense and unforgiveness** — A minister who is carrying offense toward anyone — a church member, a family member, a former mentor — is partially blind. Offense darkens the spiritual perception.

**Spiritual depletion** — A minister who is running on empty has no margin to perceive subtlety. Rest, silence, and Sabbath are not optional for the discerning minister. Elijah's discernment returned after he ate and slept (1 Kings 19).

**Fear of being wrong** — The minister who is afraid to name what he senses because he might be wrong will suppress the gift. Make the call. Submit it to accountability. Learn from the results. Growth requires the willingness to be wrong.`,
      },
    ],
    takeaway: 'The discerning minister is not a mystic or an elite — he is a person who has learned to stay close to God and stay quiet enough to hear. Start there. Everything else follows.',
  },
  {
    id: 'closing-gateways-sermon',
    title: 'Closing Spiritual Gateways',
    pages: 'Session 5',
    intro: 'Every door the enemy uses was opened by a legal right. Every legal right can be revoked. The work of closing spiritual gateways is the most practical and transferable skill in the deliverance minister\'s toolkit — because it can be taught to the person being ministered to.',
    sections: [
      {
        heading: 'The Legal Architecture of Spiritual Access',
        scripture: 'Ephesians 4:27 — "Neither give place to the devil." (KJV)',
        body: `The King James translation — "give place" — captures the legal nature of what Paul is describing. You can give the enemy a legal location, a recognized territory, in your life. And once he has it, he defends it as his.

The enemy is not random. He is strategic. He has legal teams. He presents arguments before courts. The book of Job opens with Satan appearing before God, making a legal case for access to Job's life (Job 1:6-12). The book of Zechariah shows Satan standing as accuser before the angel of the Lord (Zechariah 3:1).

This is not mythology. The spirit realm operates on legal principles because it operates under the authority of a God who is perfectly just. And because He is just, legal access granted through human choice must be revoked through human choice — specifically through repentance, renunciation, and the application of the blood of Jesus.`,
      },
      {
        heading: 'Walking Someone Through Gateway Closure',
        body: `The greatest gift you can give a newly-delivered person is the ability to close their own gateways. If they depend on a minister every time they feel the enemy at the door, they will never walk in genuine freedom.

Teach them to identify when a gateway is being knocked on — the familiar pull toward the old pattern, the familiar thought arriving uninvited. Teach them to say: "I recognize you. That door is closed in the name of Jesus. I renounce any agreement I have with this. The blood of Jesus covers this access point. Leave."

This is not magic words. It is the application of what was already done in the session — maintained by the person who now knows who they are and what the enemy is doing.`,
      },
      {
        heading: 'When Gateways Won\'t Close',
        body: `Sometimes a gateway will not close despite repeated attempts. This is not failure — it is information. Common reasons a gateway persists:

**Hidden unforgiveness** — Often the person has released forgiveness in words but not in heart. Press deeper. Ask: "Is there anyone in this situation you have not fully released?" It is often a person or a version of a memory they were not expecting.

**Unidentified vow** — A spoken commitment made in a moment of pain ("I will never trust anyone again," "I deserve this") that was never consciously renounced. Ask the Spirit to surface what was spoken.

**Object not removed** — Something in the physical environment is still consecrated to the system through which the access came. Ask about the physical space.

**Generational assignment still active** — The personal legal ground has been closed, but the family line carries an active assignment. This requires generational renunciation and breaking of inherited agreements.`,
      },
    ],
    takeaway: '"The devil doesn\'t want you to hear this." That sentence alone tells you how important this teaching is. The enemy\'s greatest vulnerability is a minister who understands legal access — because once you know how it works, you know how to revoke it. Learn this. Teach it. Watch what God does.',
  },
]


// ── MODULE CONTENT ─────────────────────────────────────────────────────────────
function ModuleContent({ mod, hasAccess, completed, onMarkComplete, saving, isMobile }: {
  mod: Module; hasAccess: boolean; completed: boolean; onMarkComplete: () => void; saving: boolean; isMobile?: boolean
}) {
  const isDark = useIsDark()
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 12px calc(80px + env(safe-area-inset-bottom, 0px))' : '28px 36px 60px' }}>
      {/* Module header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <span style={{ fontSize: 28, flexShrink: 0, marginTop: 4 }}>{mod.icon}</span>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.14em', marginBottom: 6 }}>
            MODULE {mod.number} · {mod.tier === 'free' ? 'FREE' : 'SOLDIER+'}
          </div>
          <div style={{ fontFamily: cinzel, fontSize: 20, color: G, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 8 }}>{mod.title}</div>
        </div>
      </div>

      {/* Intro */}
      <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`, borderRadius: 8, padding: '14px 18px', marginBottom: 28 }}>
        <div style={{ fontFamily: crimson, fontSize: 15, color: DIM, lineHeight: 1.7, fontStyle: 'italic' }}>{mod.intro}</div>
      </div>

      {!hasAccess ? (
        <UpgradeGate
          variant="screen"
          requiredTier={mod.tier}
          featureName="Field Manual Content"
          description={`This content is available to ${mod.tier.charAt(0).toUpperCase() + mod.tier.slice(1)} tier members and above. Upgrade your membership to unlock full access.`}
          isDark={isDark}
        />
      ) : (
        <>
          {mod.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${BDR}` }}>
                {sec.heading}
              </div>
              {sec.scripture && (
                <div style={{ fontFamily: crimson, fontSize: 13, color: G, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 14, paddingLeft: 14, borderLeft: `2px solid rgba(201,168,76,0.4)` }}>
                  {sec.scripture}
                </div>
              )}
              <div style={{ fontFamily: crimson, fontSize: 16, color: TXT, lineHeight: 1.9, whiteSpace: 'pre-wrap' as const }}>
                {sec.body.replace(/\*\*(.+?)\*\*/g, '$1')}
              </div>
            </div>
          ))}

          <div style={{ borderTop: `1px solid ${BDR}`, paddingTop: 24, marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            {completed ? (
              <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: G, display: 'flex', alignItems: 'center', gap: 6 }}>
                ✓ MODULE COMPLETE
              </span>
            ) : (
              <button
                onClick={onMarkComplete}
                disabled={saving}
                style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: BG, background: G, padding: '12px 32px', borderRadius: 4, border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontWeight: 700 }}
              >
                {saving ? 'Saving...' : '✓ Mark Module Complete'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── MODULE TAB VIEW (left list + right content) ───────────────────────────────
function ModuleTabView({ modules, progress, hasFullAccess, onMarkComplete, saving, isMobile }: {
  modules: Module[]; progress: Set<string>; hasFullAccess: boolean
  onMarkComplete: (id: string) => void; saving: boolean; isMobile: boolean
}) {
  const [selected, setSelected] = useState<Module>(modules[0])
  const [showList, setShowList] = useState(!isMobile)

  const hasAccess = (mod: Module) => mod.tier === 'free' || hasFullAccess
  const done = (id: string) => progress.has(id)

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {showList ? (
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {modules.map(mod => {
              const active = selected.id === mod.id
              const completed = done(mod.id)
              return (
                <button key={mod.id} onClick={() => { setSelected(mod); setShowList(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 20px', background: active ? 'rgba(201,168,76,0.06)' : 'transparent', border: 'none', borderLeft: `2px solid ${active ? G : 'transparent'}`, cursor: 'pointer', textAlign: 'left' as const }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, border: `1px solid ${completed ? G : BDR}`, background: completed ? G : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: completed ? 11 : 9, color: completed ? BG : MUT, fontFamily: cinzel, fontWeight: 700 }}>
                    {completed ? '✓' : mod.number}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 11, color: active ? G : TXT, letterSpacing: '0.04em', marginBottom: 2 }}>{mod.title}</div>
                    <div style={{ fontFamily: cinzel, fontSize: 8, color: MUT, letterSpacing: '0.08em' }}>{mod.tier === 'free' ? 'FREE' : '🔒 SOLDIER+'}</div>
                  </div>
                  <span style={{ color: G, fontSize: 14 }}>›</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <button onClick={() => setShowList(true)} style={{ background: 'none', border: 'none', borderBottom: `1px solid ${BDR}`, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', padding: '14px 20px', textAlign: 'left' as const, display: 'flex', alignItems: 'center', gap: 6, minHeight: 44 }}>
              ← All Modules
            </button>
            <ModuleContent mod={selected} hasAccess={hasAccess(selected)} completed={done(selected.id)} onMarkComplete={() => onMarkComplete(selected.id)} saving={saving} isMobile={isMobile} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left list */}
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${BDR}`, background: SURF, overflowY: 'auto' }}>
        {modules.map(mod => {
          const active = selected.id === mod.id
          const completed = done(mod.id)
          return (
            <button key={mod.id} onClick={() => setSelected(mod)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', background: active ? 'rgba(201,168,76,0.06)' : 'transparent', border: 'none', borderLeft: `2px solid ${active ? G : 'transparent'}`, cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.03)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, border: `1px solid ${completed ? G : BDR}`, background: completed ? G : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: completed ? 10 : 9, color: completed ? BG : MUT, fontFamily: cinzel, fontWeight: 700 }}>
                {completed ? '✓' : mod.number}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: cinzel, fontSize: 10, color: active ? G : DIM, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mod.title}</div>
                <div style={{ fontFamily: cinzel, fontSize: 7, color: MUT, letterSpacing: '0.06em', marginTop: 2 }}>{mod.tier === 'free' ? 'FREE' : '🔒 SOLDIER+'}</div>
              </div>
            </button>
          )
        })}
      </div>
      {/* Right content */}
      <ModuleContent mod={selected} hasAccess={hasAccess(selected)} completed={done(selected.id)} onMarkComplete={() => onMarkComplete(selected.id)} saving={saving} isMobile={isMobile} />
    </div>
  )
}

// ── FIELD NOTES TAB ───────────────────────────────────────────────────────────
function FieldNotesTab({ hasAccess, isMobile }: { hasAccess: boolean; isMobile: boolean }) {
  const isDark = useIsDark()
  const [selected, setSelected] = useState<Article | null>(null)

  if (selected) return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 20px 60px' : '28px 36px 60px' }}>
      <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', padding: 0, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 4, minHeight: 44 }}>
        ← Field Notes
      </button>

      <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.16em', marginBottom: 8 }}>
        {selected.pages.toUpperCase()}
      </div>
      <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 24, color: G, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 8 }}>{selected.title}</div>
      <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`, borderRadius: 8, padding: '14px 18px', marginBottom: 28 }}>
        <div style={{ fontFamily: crimson, fontSize: 15, color: DIM, lineHeight: 1.7, fontStyle: 'italic' }}>{selected.intro}</div>
      </div>

      {!hasAccess ? <UpgradeGate variant="screen" requiredTier="soldier" featureName="Field Notes" description="This content is available to Soldier tier members and above. Upgrade your membership to unlock full access." isDark={isDark} /> : (
        <>
          {selected.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.08em', marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${BDR}` }}>{sec.heading}</div>
              {sec.scripture && (
                <div style={{ fontFamily: crimson, fontSize: 13, color: G, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 14, paddingLeft: 14, borderLeft: `2px solid rgba(201,168,76,0.4)` }}>{sec.scripture}</div>
              )}
              <div style={{ fontFamily: crimson, fontSize: 16, color: TXT, lineHeight: 1.9 }}>{sec.body}</div>
            </div>
          ))}
          <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`, borderRadius: 8, padding: '18px 22px', marginTop: 8 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.16em', marginBottom: 8 }}>⚔ TAKE IT TO THE FIELD</div>
            <div style={{ fontFamily: crimson, fontSize: 15, color: TXT, lineHeight: 1.7 }}>{selected.takeaway}</div>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 20px 60px' : '28px 36px 60px' }}>
      <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.16em', marginBottom: 12 }}>PASTOR JUSTIN'S BOOTCAMP SERMONS</div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12, maxWidth: 720 }}>
        {FIELD_NOTES.map(article => (
          <div key={article.id} onClick={() => setSelected(article)}
            style={{ background: SURF, border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`, borderRadius: 10, padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = G)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = BDR)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.04em', marginBottom: 4 }}>{article.title}</div>
                <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.5 }}>{article.intro}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ fontFamily: cinzel, fontSize: 8, color: MUT, letterSpacing: '0.1em' }}>{article.pages}</span>
                {!hasAccess && <span style={{ fontFamily: cinzel, fontSize: 8, color: '#5C7CBF', background: 'rgba(92,124,191,0.1)', padding: '2px 6px', borderRadius: 3 }}>🔒 SOLDIER+</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
type Tab = 'doctrine' | 'enemy' | 'authority' | 'notes'
const TABS = [
  { id: 'doctrine'   as Tab, label: 'Doctrine',          icon: '📖', minTier: 0 },
  { id: 'enemy'      as Tab, label: 'The Enemy',         icon: '⚔',  minTier: 0 },
  { id: 'authority'  as Tab, label: 'Authority & Weapons', icon: '🛡', minTier: 0 },
  { id: 'notes'      as Tab, label: 'Field Notes',       icon: '📋', minTier: 0 },
]

function FieldManualPage() {
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const [activeTab, setActiveTab] = useState<Tab>('doctrine')
  const [progress, setProgress] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const tier = ((user?.publicMetadata?.tier as string) || 'watchman').toLowerCase()
  const tierLevel = TIER_LEVELS[tier] ?? 0
  const hasFullAccess = tierLevel >= 1
  const completedCount = [...DOCTRINE_MODULES, ...ENEMY_MODULES, ...AUTHORITY_MODULES].filter(m => progress.has(m.id)).length
  const totalModules = DOCTRINE_MODULES.length + ENEMY_MODULES.length + AUTHORITY_MODULES.length

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    getToken().then(token => {
      fetch('/api/field-manual-progress', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.progress) setProgress(new Set(d.progress.filter((p: any) => p.completed).map((p: any) => p.module_id)))
        })
        .catch(() => {})
    })
  }, [user?.id])

  async function markComplete(moduleId: string) {
    if (saving || progress.has(moduleId)) return
    setSaving(true)
    try {
      const token = await getToken()
      await fetch('/api/field-manual-progress', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_id: moduleId, completed: true }),
      })
      setProgress(prev => new Set([...prev, moduleId]))
    } catch {}
    setSaving(false)
  }

  if (!isLoaded) return (
    <div style={{ height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.2em', color: MUT }}>LOADING...</div>
    </div>
  )

  if (!user) return (
    <div style={{ height: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' as const }}>
        <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 12 }}>⚔ Field Manual</div>
        <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, marginBottom: 20 }}>Sign in to access the Field Manual</div>
        <a href="/sign-in" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: BG, background: G, padding: '10px 24px', borderRadius: 4, textDecoration: 'none' }}>SIGN IN</a>
      </div>
    </div>
  )

  const fmUserName      = user.firstName || user.username || 'Warrior'
  const fmUserTierLabel = tier === 'watchman' || tier === 'free' ? 'WATCHMAN' : tier.toUpperCase()

  return (
    <CommunitySidebarShell activeItem="Field Manual" userName={fmUserName} userTierLabel={fmUserTierLabel} fillViewport>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: BG, overflow: 'hidden' }}>
      {/* Hero banner */}
      <div style={{ padding: isMobile ? '0 16px' : '0 32px', background: `linear-gradient(180deg, rgba(201,168,76,0.08) 0%, transparent 100%)`, borderBottom: `1px solid ${BDR}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT }}>FIELD OPERATIONS</div>
            </div>
            <div style={{ fontFamily: cinzel, fontSize: isMobile ? 18 : 22, color: G, fontWeight: 700, marginTop: 8, letterSpacing: '0.06em' }}>
              ⚔ Field Manual
            </div>
            <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', marginBottom: 10, marginTop: 2 }}>
              Foundational doctrine for the spiritual warrior
            </div>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: isMobile ? 100 : 140, height: 3, background: 'rgba(201,168,76,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(completedCount / totalModules) * 100}%`, background: G, borderRadius: 2, transition: 'width 0.4s ease' }} />
              </div>
              <span style={{ fontFamily: cinzel, fontSize: 8, color: MUT, letterSpacing: '0.08em' }}>
                {completedCount}/{totalModules} MODULES COMPLETE
              </span>
            </div>
          </div>
          {!isMobile && (
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, textAlign: 'right' as const }}>
              <div>{tier.toUpperCase()}</div>
              <div style={{ color: G, marginTop: 2 }}>{user.firstName || user.username || 'Warrior'}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' as any }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '10px 14px' : '12px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${active ? G : 'transparent'}`, cursor: 'pointer', marginBottom: -1, flexShrink: 0 }}>
                <span style={{ fontSize: 13 }}>{tab.icon}</span>
                <span style={{ fontFamily: cinzel, fontSize: isMobile ? 9 : 10, letterSpacing: '0.1em', color: active ? G : MUT, whiteSpace: 'nowrap' as const }}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'doctrine' && (
          <ModuleTabView modules={DOCTRINE_MODULES} progress={progress} hasFullAccess={tierLevel >= 0} onMarkComplete={markComplete} saving={saving} isMobile={isMobile} />
        )}
        {activeTab === 'enemy' && (
          <ModuleTabView modules={ENEMY_MODULES} progress={progress} hasFullAccess={hasFullAccess} onMarkComplete={markComplete} saving={saving} isMobile={isMobile} />
        )}
        {activeTab === 'authority' && (
          <ModuleTabView modules={AUTHORITY_MODULES} progress={progress} hasFullAccess={hasFullAccess} onMarkComplete={markComplete} saving={saving} isMobile={isMobile} />
        )}
        {activeTab === 'notes' && (
          <FieldNotesTab hasAccess={hasFullAccess} isMobile={isMobile} />
        )}
      </div>
    </div>
    </CommunitySidebarShell>
  )
}
