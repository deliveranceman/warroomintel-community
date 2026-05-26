#!/usr/bin/env python3
"""
Seed Norse spirit entries into the War Room Intel Airtable database.
Usage: python3 scripts/seed-norse-spirits.py <AIRTABLE_PAT>
Get a fresh PAT at: https://airtable.com/create/tokens
Required scopes: data.records:write, schema.bases:read
"""

import json, time, sys, urllib.request, urllib.error

TOKEN  = sys.argv[1] if len(sys.argv) > 1 else 'PASTE_FRESH_TOKEN_HERE'
BASE   = 'appVXEj2DLPBTJTtD'
TABLE  = 'tblcP4lgVykzOhLi4'
URL    = f'https://api.airtable.com/v0/{BASE}/{TABLE}'
NAME_F = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

SPIRITS = [
  {
    NAME_F: 'Odin',
    'Also Known As': 'Woden, Wotan, Allfather, the Wanderer, Grimnir, Gangleri',
    'Description': 'Chief principality of the Norse pantheon operating as a false father-god and counterfeit of divine wisdom. Commands through deception, occult knowledge, and the promise of power through sacrifice. Particularly active in Scandinavian, Germanic, and Anglo-Saxon bloodlines and in modern neopagan, Asatru, and occult movements. Odin demanded human sacrifice — including hanging and spear-piercing mimicking his self-sacrifice on Yggdrasil — opening severe bloodline curses of death, suicide, and occult bondage.',
    'Manifestiation': 'Obsession with hidden knowledge, secret societies, and occult wisdom. Grandiose sense of spiritual authority. Wandering spirit — restlessness, inability to settle or commit. One-eyed spiritual blindness — can see in the spiritual but distorted. Depression and melancholy framed as depth of wisdom. Suicidal ideation framed as sacrifice. Connection to ravens, wolves, and death symbolism.',
    'Entry Points': 'Norse/Germanic ancestry, Asatru or neopagan involvement, Viking heritage with ancestor veneration, Freemasonry (Odin parallels in lodge ritual), occult pursuit of hidden wisdom, rune use, shamanic journeying, blood oaths',
    'Legal Rights': 'Ancestral participation in Norse paganism and sacrifice, rune magic and divination, blood oaths to Odin, Asatru initiation rites, Freemasonry bloodline (Hiram Abiff/Odin parallel), generational false father wounds creating spiritual orphan spirit',
    'Symptoms': 'Restlessness and wandering, depression framed as wisdom, spiritual pride, fascination with death, ravens, wolves, esoteric knowledge-seeking, inability to receive true fathering',
    'Companion Spirits': 'Leviathan, Mind Control, Pride, Witchcraft, Death, Spiritual Orphan, False Wisdom, Deception',
    'WRI Exorcist Notes': 'Break all ancestral Norse pagan covenants first. Address false father wound — this spirit exploits father absence and spiritual orphan identity. Leviathan almost always co-present through the pride and twisted communication. Inner healing on father wound is critical before Power Model. Renounce all rune use, Asatru involvement, and any lodge connections in bloodline.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Odin',
    'Assignment': 'Counterfeit divine wisdom, spiritual orphaning, death covenant, occult bondage',
    'Deliverance Sequence': 'Repentance → Renunciation → Inner Healing (father wound) → Expulsion',
    'Operational Notes': 'Never engage in dialogue. Move quickly once legal rights broken. Cluster is large — work through companion spirits systematically after Odin is expelled.',
    'Counter Scriptures': 'Isaiah 9:6, John 14:6, 1 Corinthians 1:20, James 1:5, Romans 8:15',
    'Scripture Reference': 'Isaiah 8:19-20, Deuteronomy 18:10-12, Isaiah 9:6',
    'Source / Orgin': 'Norse/Germanic mythology; ANE paganism; Asatru; Freemasonry parallels',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Intellectually superior, philosophically deep, brooding, isolated',
    'Is Generational': True,
    'Is Territorial': True,
  },
  {
    NAME_F: 'Thor',
    'Also Known As': 'Donar, Thunar, the Thunderer, Son of Odin',
    'Description': 'Principality operating through false strength, rage, and storm. Thor is a counterfeit of divine strength and protection — offering the illusion of power through rage, dominance, and physical force. Heavily active in masculinity movements, rage-based coping, and cultures that worship strength. Operates through the Norse/Germanic bloodline and has significant activation in modern Thor-worship through popular culture normalization.',
    'Manifestiation': 'Explosive anger and rage presented as strength. Hypermasculine identity built on dominance. Storm-related fear or fascination. Physical aggression as primary conflict response. Protector spirit turned abusive — controlling through strength rather than love. Hammer imagery and violence glorification.',
    'Entry Points': 'Norse/Germanic ancestry, rage and violence generational patterns, hypermasculine identity wounds, Asatru/neopagan involvement, fascination or worship through media (Marvel normalization), storm fear or reverence',
    'Legal Rights': 'Generational rage and violence in bloodline, false strength identity built on trauma, Norse ancestral worship, any vows made to Thor for protection or strength',
    'Symptoms': 'Uncontrollable rage, need to dominate, physical violence, storm phobia or obsession, hypermasculinity masking deep weakness and fear',
    'Companion Spirits': 'Rage, Violence, False Strength, Fear, Control, Pride, Storm Spirit',
    'WRI Exorcist Notes': 'Address the false strength identity — this spirit operates through a man who was never given true strength through godly fathering. Inner healing on the wound of weakness before expulsion. Bind rage first before addressing root.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Thor',
    'Assignment': 'False strength, rage, masculine identity corruption, storm and destruction',
    'Deliverance Sequence': 'Repentance → Renunciation → Inner Healing (strength/weakness wound) → Expulsion',
    'Operational Notes': 'Bind rage first. Do not allow the session to become a demonstration of strength — the spirit will attempt to manifest violently. Inner healing on weakness wound is the key.',
    'Counter Scriptures': '2 Corinthians 12:9-10, Philippians 4:13, Psalm 46:1, Isaiah 40:29-31',
    'Scripture Reference': 'Psalm 46:1, Isaiah 40:28-31',
    'Source / Orgin': 'Norse/Germanic mythology; Asatru; Germanic paganism',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Domineering, explosive, physically imposing, easily provoked',
    'Is Generational': True,
    'Is Territorial': False,
  },
  {
    NAME_F: 'Loki',
    'Also Known As': 'Loge, the Trickster, Shapeshifter, Father of Lies (Norse parallel)',
    'Description': 'High-ranking demonic principality operating through chaos, deception, and identity confusion. Loki is perhaps the most directly Satanic of the Norse pantheon — a deceiver and shapeshifter who destabilizes systems, relationships, and identities. Operates through lying spirits, confusion, chaos-sowing, and gender/identity confusion. Has been significantly normalized through popular culture and is actively worshipped in chaos magic and Lokean neopagan communities.',
    'Manifestiation': 'Pathological lying and deception. Chaos-creation in relationships and communities. Shape-shifting identity — inability to maintain consistent character or commitment. Gender confusion and identity fluidity. Sabotage of good things. Trickster patterns — using humor to wound. Chaos magic involvement.',
    'Entry Points': 'Norse ancestry, Lokean neopagan worship, chaos magic, gender identity confusion, pathological lying patterns in bloodline, trickster family systems, sabotage and chaos as coping mechanism',
    'Legal Rights': 'Ancestral Norse paganism, chaos magic involvement, any direct worship or acknowledgment of Loki, generational deception and lying patterns, identity confusion wounds',
    'Symptoms': 'Compulsive lying, chaos creation, identity instability, gender confusion, inability to commit, sabotage of blessing, humor used as a weapon',
    'Companion Spirits': 'Deception, Confusion, Chaos, Lying Spirit, Identity Confusion, Sabotage, Gender Confusion',
    'WRI Exorcist Notes': 'Verify identity carefully — this spirit will attempt to confuse the session through misdirection. Bind confusion before proceeding. Address root identity wound — Loki spirits attach to those with profound identity wounds and orphan spirit. Inner healing on identity in Christ is critical.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Loki',
    'Assignment': 'Chaos, deception, identity destruction, sabotage of covenant relationships',
    'Deliverance Sequence': 'Repentance → Renunciation → Bind Confusion → Inner Healing (identity) → Expulsion',
    'Operational Notes': 'Bind confusion and deception at the start of every session where Loki is suspected. Do not follow rabbit trails — the spirit will attempt to redirect constantly.',
    'Counter Scriptures': 'John 8:44, John 14:6, 2 Corinthians 5:17, Ephesians 4:15',
    'Scripture Reference': 'John 8:44, Proverbs 6:16-19',
    'Source / Orgin': 'Norse mythology; chaos magic; Lokean neopaganism',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Charming, unpredictable, humorous but destructive, identity chameleon',
    'Is Generational': True,
    'Is Territorial': False,
  },
  {
    NAME_F: 'Freya',
    'Also Known As': 'Freyja, Vanadis, Lady, Gefn, Horn, Mardoll, Syr, Thrung',
    'Description': 'High-ranking principality of sexual witchcraft, seduction, and seidr (Norse shamanic magic). Freya is the Norse equivalent of Jezebel/Ashtoreth — a seducing spirit that combines sexual power with witchcraft authority. Commands over fertility, war, death, and magic. Particularly active in feminist witchcraft, Wicca, and goddess-worship movements. Opens severe sexual and witchcraft bondage in bloodlines.',
    'Manifestiation': 'Seduction and sexual manipulation. Witchcraft operating through sexuality. Goddess worship and feminist spirituality. Sexual power as spiritual authority. War-goddess manifestation — Valkyrie spirit, drawing people to their death. Obsession with beauty and desirability as identity.',
    'Entry Points': 'Norse/Germanic ancestry, Wicca and goddess worship, feminist spirituality movements, sexual witchcraft, Freya devotion in neopaganism, generational patterns of sexual manipulation and seduction',
    'Legal Rights': 'Ancestral Norse goddess worship, Wiccan initiation, sexual soul ties, seidr practice, any dedication or ritual to Freya, generational sexual sin and witchcraft',
    'Symptoms': 'Sexual compulsion and manipulation, witchcraft tendencies, goddess worship, obsession with beauty and desirability, Valkyrie spirit (drawing others to death or destruction)',
    'Companion Spirits': 'Jezebel, Sexual Witchcraft, Seduction, Vanity, Death, Seidr, Goddess Spirit',
    'WRI Exorcist Notes': 'Treat as Jezebel variant with stronger witchcraft component. Sexual soul ties must be broken completely before expulsion. Seidr/witchcraft renunciation is critical — this spirit operates through the gift counterfeit of prophetic power. Address beauty/identity wound.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Freya',
    'Assignment': 'Sexual seduction, witchcraft authority, Valkyrie spirit (drawing to death), goddess worship',
    'Deliverance Sequence': 'Repentance → Soul Tie Breaking → Witchcraft Renunciation → Expulsion',
    'Operational Notes': 'Never allow Freya spirits to operate through attractiveness or emotional connection with the minister. Team accountability essential. Seidr renunciation before any prophetic gifting can be restored.',
    'Counter Scriptures': '1 Corinthians 6:18-20, Galatians 5:19-21, Deuteronomy 18:10-12, Proverbs 31:30',
    'Scripture Reference': 'Deuteronomy 18:10-12, 1 Samuel 15:23, Proverbs 5:3-6',
    'Source / Orgin': 'Norse mythology; Vanatru; Wicca; goddess worship traditions',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Seductive, powerful, beauty-obsessed, spiritually authoritative in a counterfeit way',
    'Is Generational': True,
    'Is Territorial': False,
  },
  {
    NAME_F: 'Fenrir',
    'Also Known As': 'Fenrisulfr, Hrodvitnir, the Wolf, the Devourer',
    'Description': 'A powerful demonic entity associated with destruction, uncontrollable rage, and the devouring spirit. Fenrir represents bondage that grows stronger the more it is restrained — a perfect picture of addiction and compulsion cycles. Operates through rage, violence, destruction, and the devouring of all good things. Associated with end-time destruction in Norse mythology — a nihilistic spirit.',
    'Manifestiation': 'Uncontrollable rage and violence. Addiction cycles that grow stronger with each restraint attempt. Devouring spirit — destroys relationships, finances, health. Nihilism and destructive worldview. Wolf pack mentality — gang and tribal violence. Restraint and bondage — feels physically chained.',
    'Entry Points': 'Generational violence and rage, addiction bloodline patterns, Norse ancestry, wolf symbolism involvement, nihilism and destructive worldview, gang involvement',
    'Legal Rights': 'Generational violence and rage, addiction opening doors, any Norse worship involving Fenrir, nihilistic vows and agreements',
    'Symptoms': 'Rage that feels uncontrollable, addiction that strengthens with each failed attempt to quit, destructive behavior, nihilism, wolf/pack mentality, feeling physically bound or restrained',
    'Companion Spirits': 'Rage, Addiction, Destruction, Nihilism, Violence, Devouring Spirit, Bondage',
    'WRI Exorcist Notes': 'Bind the devouring spirit first. Address addiction legal ground completely before expulsion — this spirit returns through any unclosed addiction door. The rage is usually covering profound helplessness and fear underneath. Inner healing on powerlessness is key.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Fenrir',
    'Assignment': 'Destruction, devouring, addiction bondage, uncontrollable rage',
    'Deliverance Sequence': 'Repentance → Addiction Renunciation → Bind Devouring → Expulsion',
    'Operational Notes': 'This spirit grows stronger through failed restraint attempts — do not attempt partial deliverance. All addiction legal ground must be closed in one session if possible, or the spirit will return with reinforcements.',
    'Counter Scriptures': '1 Peter 5:8-9, Romans 8:1-2, John 8:36, Galatians 5:1',
    'Scripture Reference': '1 Peter 5:8, John 8:34-36',
    'Source / Orgin': 'Norse mythology; Germanic paganism',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Rageful, addicted, nihilistic, feels out of control',
    'Is Generational': True,
    'Is Territorial': False,
  },
  {
    NAME_F: 'Hel',
    'Also Known As': 'Hela, Queen of Niflheim, Lady of the Dead',
    'Description': 'Principality ruling over death, depression, and the realm of the dead. Hel is the Norse goddess of the underworld — ruling over those who die of sickness and old age. As a demonic entity she operates through depression, death wish, suicidal ideation, communication with the dead, grief bondage, and the spirit of death. Half-living, half-dead in Norse mythology — perfectly picturing the person trapped between life and death emotionally and spiritually.',
    'Manifestiation': 'Chronic depression and hopelessness. Suicidal ideation and death wish. Communication with the dead — necromancy and ancestor worship. Grief that will not lift — prolonged mourning bondage. Half-life — existing but not truly living. Cold emotional affect. Death imagery obsession. Near-death experiences that opened spiritual doors.',
    'Entry Points': 'Norse ancestry, ancestor veneration and communication with the dead, near-death experiences, profound grief and loss, suicidal attempts or ideation in bloodline, necromancy and spiritism involvement, profound hopelessness',
    'Legal Rights': 'Ancestral Norse underworld worship, any communication with the dead, suicidal covenants, grief bondage that was never healed, generational depression and death in bloodline',
    'Symptoms': 'Suicidal ideation, chronic depression, inability to enjoy life, coldness and emotional numbness, communication with dead loved ones, prolonged grief, death wish, feeling half-alive',
    'Companion Spirits': 'Death, Depression, Suicide, Grief, Hopelessness, Necromancy, Ancestor Spirits',
    'WRI Exorcist Notes': 'Safety assessment critical before session. Break all covenants with death first (Isaiah 28:15-18). Address necromancy and ancestor communication completely. Inner healing on grief and loss before expulsion. Suicide spirit must be addressed directly — bind death before working roots.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Hel',
    'Assignment': 'Death, depression, suicidal bondage, underworld access, grief captivity',
    'Deliverance Sequence': 'Repentance → Break Death Covenant → Necromancy Renunciation → Inner Healing → Expulsion',
    'Operational Notes': 'Safety assessment first — do not proceed if active suicidal ideation is present without proper pastoral covering. Isaiah 28:15-18 is the primary weapon against death covenants.',
    'Counter Scriptures': 'Isaiah 28:15-18, Psalm 30:3, John 11:25-26, Revelation 1:18, Romans 8:38-39',
    'Scripture Reference': 'Isaiah 28:15, Deuteronomy 18:11, 1 Samuel 28',
    'Source / Orgin': 'Norse mythology; Germanic underworld traditions; spiritism',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Depressed, hopeless, cold, emotionally flat, death-preoccupied',
    'Is Generational': True,
    'Is Territorial': False,
  },
  {
    NAME_F: 'Jormungandr',
    'Also Known As': 'The Midgard Serpent, World Serpent, Ouroboros (related), Son of Loki',
    'Description': 'The Norse manifestation of the Leviathan spirit — a massive serpentine principality that encircles and constricts. In Norse mythology Jormungandr encircles the entire world, holding it in constriction. As a demonic entity, operates identically to Leviathan — pride, twisted communication, constriction of breakthrough, encircling of regions and families. Directly related to Loki (deception). The world-encircling serpent is one of the most powerful territorial principalities in the Norse spiritual system.',
    'Manifestiation': 'Pride and arrogance. Twisted communication — conversations go in circles. Constriction of breakthrough and blessing. Territorial encircling of regions with Norse/Germanic heritage. Neck and throat manifestations. Feeling encircled, trapped, unable to break free. World-weariness and nihilism.',
    'Entry Points': 'Norse/Germanic ancestry, Leviathan legal ground (pride, unforgiveness), territorial Norse presence in region, Loki worship (parent spirit), generational pride and arrogance',
    'Legal Rights': 'Same as Leviathan — pride, unforgiveness, twisted communication. Additional: Norse ancestry, Jormungandr-specific worship, territorial Norse covenants in region',
    'Symptoms': 'Identical to Leviathan — pride, twisted communication, neck/throat manifestations, conversations that circle without resolution, breakthrough constriction',
    'Companion Spirits': 'Leviathan, Pride, Loki, Constriction, Territorial Encircling, World Serpent Spirits',
    'WRI Exorcist Notes': 'Treat as Leviathan with Norse territorial component. If region has Norse/Viking heritage, this may be the territorial principality over the area. Use Leviathan deliverance protocol. Break Loki deception first (parent spirit). Isaiah 27:1 applies directly.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Jormungandr / Leviathan',
    'Assignment': 'Territorial constriction, pride, twisted communication, encircling of families and regions',
    'Deliverance Sequence': 'Repentance → Break Pride → Loki Renunciation → Leviathan Protocol → Expulsion',
    'Operational Notes': 'Use full Leviathan protocol. If ministering in a region with Viking/Norse heritage (Scandinavia, UK, Iceland, parts of North America), consider this spirit as a possible territorial principality.',
    'Counter Scriptures': 'Isaiah 27:1, Job 41, Psalm 74:13-14, Colossians 2:15',
    'Scripture Reference': 'Isaiah 27:1, Job 41:1-34, Psalm 74:13-14',
    'Source / Orgin': 'Norse mythology; Leviathan parallel; Germanic paganism',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Arrogant, pride-filled, communication that goes in circles',
    'Is Generational': True,
    'Is Territorial': True,
  },
  {
    NAME_F: 'Valkyrie',
    'Also Known As': 'Choosers of the Slain, Battle Maidens, Shield Maidens, Valkyrja',
    'Description': 'A class of demonic entities operating as death-selectors and spiritual violence agents. In Norse mythology Valkyries chose who died in battle and escorted them to Valhalla. As demonic entities they operate through spiritual violence, premature death assignment, battle-addiction, and the glorification of violence and war. Connected to Freya as their queen. In modern expression active through warrior-culture obsession, battle addiction in military, premature death assignments, and blood-covenant violence.',
    'Manifestiation': 'Glorification of violence and war. PTSD manifestations with spiritual component. Premature death assignments. Battle addiction — cannot function outside of conflict and crisis. Warrior-identity so dominant that peace feels threatening. Spiritual violence — drawing others into conflict. Death-selection dreams and visions.',
    'Entry Points': 'Military service with exposure to Norse warrior culture, Norse ancestry, Valkyrie worship in neopaganism, shield-maiden identity in feminist spirituality, PTSD with spiritual doors, Freya worship (queen of Valkyries), blood-covenant violence',
    'Legal Rights': 'Norse ancestral worship, Freya bloodline connection, violence in bloodline, PTSD doors, warrior-culture vows, any Valkyrie devotion or identification',
    'Symptoms': 'Battle addiction, inability to function in peace, PTSD with spiritual component, premature death assignments over self or others, warrior-identity over all others, spiritual violence toward others',
    'Companion Spirits': 'Freya, Death, PTSD Spirit, Battle Addiction, Violence, Premature Death',
    'WRI Exorcist Notes': 'Address PTSD spiritual component separately from trauma therapy. Break warrior-identity as primary identity before expulsion. Freya must be addressed as queen spirit. Premature death assignment must be explicitly broken.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Freya (queen); Odin (commander)',
    'Assignment': 'Death selection, spiritual violence, battle addiction, PTSD spiritual bondage',
    'Deliverance Sequence': 'Repentance → Break Death Assignment → PTSD Inner Healing → Freya Renunciation → Expulsion',
    'Operational Notes': 'Veterans and military with Norse ancestry are high-risk for this cluster. PTSD inner healing must accompany deliverance — purely spiritual approach without trauma healing will not produce lasting freedom.',
    'Counter Scriptures': 'Romans 8:37-39, Isaiah 54:17, Psalm 91, John 10:10',
    'Scripture Reference': 'Isaiah 54:17, John 10:10, Psalm 91:3',
    'Source / Orgin': 'Norse mythology; Vanatru; neopagan shield-maiden movement',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Warrior-identity dominant, conflict-addicted, cannot receive peace',
    'Is Generational': True,
    'Is Territorial': False,
  },
  {
    NAME_F: 'Nidhogg',
    'Also Known As': 'Nidhoggr, the Corpse-Gnawer, Malice Striker, Dragon of Nastrond',
    'Description': 'A powerful demonic entity of corruption, gnawing destruction, and consuming the dead. Nidhogg in Norse mythology perpetually gnaws at the roots of Yggdrasil — the world tree — seeking to bring the entire cosmic order down through patient, persistent corruption. As a demonic entity operates through slow corruption of good things, consuming guilt and shame, gnawing accusation, and the consuming of spiritual foundations.',
    'Manifestiation': 'Persistent gnawing guilt and accusation. Slow corruption of good things — marriages, ministries, health. Patient destruction — not dramatic but persistent. Consuming shame — gnaws at identity. Attacks the roots — foundational areas of life. Dragon/serpent manifestation.',
    'Entry Points': 'Norse ancestry, generational oath-breaking and murder, shame-based identity, persistent accusation patterns in bloodline, dragon worship or imagery involvement, foundational destruction patterns',
    'Legal Rights': 'Generational oath-breaking, murder and blood guilt in bloodline, Norse ancestral worship, persistent unrepented shame, any Nidhogg invocation or worship',
    'Symptoms': 'Constant gnawing guilt and shame that cannot be silenced, slow corruption of good things, persistent accusation, foundation-level destruction in life areas, dragon imagery obsession',
    'Companion Spirits': 'Accusation, Shame, Guilt, Corruption, Foundational Destruction, Devouring Spirit',
    'WRI Exorcist Notes': 'Address all blood guilt and oath-breaking in the bloodline first. Shame must be addressed through inner healing — this spirit feeds on unhealed shame. Accusation cluster must be broken. Nidhogg is patient — sessions may need multiple visits as foundational ground is cleared.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Nidhogg',
    'Assignment': 'Foundational corruption, gnawing accusation and shame, slow destruction of good things, blood guilt',
    'Deliverance Sequence': 'Repentance → Blood Guilt Breaking → Shame Inner Healing → Expulsion',
    'Operational Notes': 'Slow-working spirit — do not expect dramatic manifestation. Works through persistent guilt, shame, and slow erosion. Multiple sessions may be needed. Blood guilt in the generational line is the primary legal ground.',
    'Counter Scriptures': 'Romans 8:1, Revelation 12:10-11, Isaiah 54:17, Colossians 2:14',
    'Scripture Reference': 'Romans 8:1, Revelation 12:10, Isaiah 54:17',
    'Source / Orgin': 'Norse mythology; Germanic underworld traditions',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Shame-filled, persistently guilty, slowly corrupting good things',
    'Is Generational': True,
    'Is Territorial': False,
  },
  {
    NAME_F: 'Tyr',
    'Also Known As': 'Tiwaz, Tiw, Ziu, the One-Handed God, God of Justice',
    'Description': "Norse principality of false justice, law, and blood sacrifice. Tyr is the Norse god of law, justice, and single combat — known for sacrificing his hand to bind Fenrir. As a demonic entity operates through legalism, false justice systems, blood sacrifice legal ground, and the spirit of self-mutilation as sacrifice. Active in legal systems that operate outside of God's justice, false covenant systems, and bloodline patterns of sacrifice and self-harm.",
    'Manifestiation': 'Legalism and false justice. Self-sacrifice to the point of self-destruction. Self-mutilation framed as noble sacrifice. Binding oneself to destructive agreements for the sake of community or law. Single-combat mentality — isolation and self-sufficiency. Hand/arm manifestations in session.',
    'Entry Points': 'Norse ancestry, legalism bloodline, self-mutilation patterns, blood sacrifice involvement, false justice involvement, single-handed carrying of burdens, rune Tiwaz use',
    'Legal Rights': 'Norse ancestral worship, any use of Tiwaz rune, blood sacrifice in bloodline, self-mutilation history, legalistic covenant bloodline, false justice systems participated in',
    'Symptoms': 'Extreme legalism, self-sacrifice to destruction, self-mutilation history, arm/hand manifestations, isolation and self-sufficiency, binding oneself to destructive agreements',
    'Companion Spirits': 'Legalism, Self-Mutilation, False Justice, Blood Sacrifice, Isolation, Self-Destruction',
    'WRI Exorcist Notes': 'Address self-mutilation spiritual roots before inner healing. Break all blood sacrifice legal ground. Tyr connects to Fenrir through the binding myth — if Fenrir is present, Tyr often is as well. Renounce Tiwaz rune specifically.',
    'Hierarchy Category': 'General Oppression',
    'Strongman': 'Tyr',
    'Assignment': 'False justice, legalistic bondage, self-sacrifice to destruction, blood sacrifice legal ground',
    'Deliverance Sequence': 'Repentance → Blood Sacrifice Breaking → Rune Renunciation → Expulsion',
    'Operational Notes': 'Tyr and Fenrir frequently co-present. If Fenrir is in the session, check for Tyr. Tiwaz rune use must be explicitly renounced. Self-mutilation requires both spiritual and pastoral/counseling support.',
    'Counter Scriptures': 'Romans 3:21-26, Galatians 3:10-13, Colossians 2:14, Isaiah 61:1-3',
    'Scripture Reference': 'Romans 3:23-26, Galatians 3:13, Colossians 2:14',
    'Source / Orgin': 'Norse mythology; Germanic law traditions; runic systems',
    'Primary Battlefield': 'Mind and will',
    'Typical Personality Presentation': 'Legalistic, self-sacrificing to excess, isolated, arms burden alone',
    'Is Generational': True,
    'Is Territorial': False,
  },
]

print(f'Inserting {len(SPIRITS)} Norse spirits into Airtable...\n')
results = []
for spirit in SPIRITS:
  name = spirit.get(NAME_F, 'Unknown')
  payload = json.dumps({'fields': spirit}).encode('utf-8')
  req = urllib.request.Request(URL, data=payload, method='POST')
  req.add_header('Authorization', f'Bearer {TOKEN}')
  req.add_header('Content-Type', 'application/json')
  try:
    with urllib.request.urlopen(req, timeout=15) as resp:
      data = json.loads(resp.read())
      print(f'✓  {name} — id: {data.get("id","?")}')
      results.append((name, True, data.get('id','')))
  except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='replace')
    print(f'✗  {name} — HTTP {e.code}: {body[:300]}')
    results.append((name, False, body[:300]))
  except Exception as ex:
    print(f'✗  {name} — ERROR: {ex}')
    results.append((name, False, str(ex)))
  time.sleep(0.5)

print(f'\n--- SUMMARY ---')
ok  = [r for r in results if r[1]]
err = [r for r in results if not r[1]]
print(f'Created: {len(ok)}/{len(results)}')
if err:
  print('Failed:')
  for r in err: print(f'  {r[0]}: {r[2][:120]}')
