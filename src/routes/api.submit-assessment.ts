import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../../netlify/functions/_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

function diagnoseFlaggedSpirits(data: Record<string, any>): string {
  const lines: string[] = []
  const priority: string[] = []

  const str = (k: string) => (data[k] || '').toString().trim()
  const arr = (k: string): string[] => Array.isArray(data[k]) ? data[k] : []
  const has = (k: string, v: string) => str(k).toLowerCase().includes(v.toLowerCase())
  const arrHas = (k: string, v: string) => arr(k).some((x: string) => x.toLowerCase().includes(v.toLowerCase()))

  // ── CATEGORY A: REJECTION ────────────────────────────────────────────
  const catA: string[] = []

  if (has('A - Father Relationship', 'Bad') || has('A - Father Relationship', 'Absent') || has('A - Father Relationship', 'Indifferent') || has('A - Father Relationship', 'Never knew')) {
    catA.push(`Father relationship (${str('A - Father Relationship')}) → Spirit of Rejection, Fear, Dread, Guilt & Shame. Break patriarchal bondages. Cast out inherited spirits: apathy, passivity, anger, laziness.`)
  }
  if (has('A - Mother Relationship', 'Bad') || has('A - Mother Relationship', 'Absent') || has('A - Mother Relationship', 'Indifferent') || has('A - Mother Relationship', 'Never knew')) {
    catA.push(`Mother relationship (${str('A - Mother Relationship')}) → Spirit of Rejection, Fear, Dread, Guilt & Shame. Break matriarchal bondages. Cast out inherited spirits.`)
  }
  if (has('A - Planned Child', 'No') || data['A - Planned Child'] === false) {
    catA.push('Not a planned child → Spirit of Rejection.')
  }
  if (has('A - Adopted', 'Yes')) {
    catA.push('Adopted → Spirits of Rejection, Abandonment. Pray forgiveness of biological parents.')
  }
  if (has('A - Parents Divorced', 'Yes') || has('A - Parents Divorced', 'Separated')) {
    catA.push('Parents divorced/separated → Spirit of Rejection, Fear of Abandonment, Betrayal, Covenant-Breaking Spirit. Forgiveness issues.')
  }
  if (has('A - Childhood Home Happy', 'No') || data['A - Childhood Home Happy'] === false) {
    catA.push('Unhappy childhood home → Spirit of Rejection. Forgiveness issues.')
  }
  if (has('A - Lonely As Teenager', 'Yes')) {
    catA.push('Lonely as teenager → Spirit of Rejection, Rebellion, Independence, Abandonment. Forgiveness issues.')
  }

  const selfImage = arr('A - Self Image')
  if (selfImage.some(s => ['Hate myself','Feel worthless','Condemn myself','Feel like a failure','Feel inferior'].includes(s))) {
    catA.push(`Self image issues (${selfImage.join(', ')}) → Low self-image is symptom of Rejection. Look for: Hopelessness, Depression, Despair, Self-Accusation, Self-Condemnation, Self-Punishment.`)
  }

  if (catA.length) {
    lines.push('═══ CATEGORY A: REJECTION ═══')
    catA.forEach(l => lines.push('• ' + l))
    lines.push(`  ⚑ STRONGMAN: Spirit of Rejection`)
    lines.push('')
  }

  // ── CATEGORY B: MENTAL & EMOTIONAL ──────────────────────────────────
  const catB: string[] = []

  const anxiety = arr('B - Anxiety Depression')
  if (anxiety.includes('Depression') || anxiety.includes('Anxious') || anxiety.includes('Chronic worry')) {
    catB.push(`Anxiety/Depression (${anxiety.join(', ')}) → Strongman of Heaviness. Spirits: Anxiety, Doubt & Unbelief, Depression, Despair. Check family history.`)
  }
  if (anxiety.includes('Mental confusion') || anxiety.includes('Mental blocks')) {
    catB.push('Mental confusion / blocks → Possible Freemasonry connection. Spirits of Confusion, Occultism, Witchcraft, Antichrist, Stupor.')
  }
  if (anxiety.includes('Day-dreaming / escapism')) {
    catB.push('Excessive day-dreaming → Spirits of Escapism, Fantasy, False Comfort, Addiction. Possible Freemasonry.')
  }

  const suicideHistory = str('B - Suicide History')
  if (suicideHistory && suicideHistory !== 'Never') {
    if (suicideHistory.includes('Attempted')) {
      priority.push('⚠ SUICIDE ATTEMPT — Spirits of Death, Depression, Self-Pity, Fear, Shame. Have person repent. Check for deaf/dumb spirit if felt driven/out of control.')
    } else {
      catB.push('Suicidal thoughts → Spirits of Death, Depression, Self-Pity. Break any spoken word curses of death. Have person repent.')
    }
  }

  const fears = arr('B - Fears').filter(f => f !== 'None')
  if (fears.length) {
    catB.push(`Fears: ${fears.join(', ')} → Name each spirit by its specific fear (e.g. "spirit of fear of failure"). Find entry points — first time fear was experienced. Treat past AND current fears. Also may be symptom of Freemasonry.`)
  }

  const mindStates = arr('B - Occult Mind Notes')
  if (mindStates.some(s => ['Psychiatric hospitalization','Hypnosis','Heavy drug use','Shock treatment','Extended unconsciousness'].includes(s))) {
    catB.push(`Passive mind states (${mindStates.join(', ')}) → Deaf and dumb spirits, Heaviness, Depression. Cast out any spirits that entered during unguarded mental state. Close doors opened during hypnotic/drugged state.`)
  }

  const dreamsSleep = str('B - Dreams Sleep')
  if (dreamsSleep && dreamsSleep !== 'Neither') {
    catB.push(`${dreamsSleep} → Spirits of Fear, Lust (per content). Also symptoms of Freemasonry. Check content of dreams for revealing spirits.`)
  }

  if (catB.length) {
    lines.push('═══ CATEGORY B: MENTAL & EMOTIONAL ═══')
    catB.forEach(l => lines.push('• ' + l))
    lines.push('  ⚑ STRONGMAN: Strongman of Heaviness')
    lines.push('')
  }

  // ── CATEGORY C: WITCHCRAFT & OCCULT ─────────────────────────────────
  const catC: string[] = []

  const devilPact = str('C - Devil Pact')
  if (devilPact && devilPact !== 'No') {
    priority.push(`⚠ DEVIL PACT (${devilPact}) — Brings curse. Person must repent. If blood pact, apply oil representing blood of Jesus. Have person specifically renounce the pact reversing specific words spoken. Familiar Spirits, Witchcraft, Occult, Antichrist, Manipulation, Fear.`)
  }

  const occult = arr('C - Occult Activities').filter(a => a !== 'None')
  if (occult.length) {
    const occultMap: Record<string,string> = {
      'Fortunetellers': 'Spirit of Divination, Familiar Spirits',
      'Tarot cards': 'Spirit of Divination, Familiar Spirits',
      'Ouija board': 'Spirit of Divination, Familiar Spirits — HIGH PRIORITY DOOR',
      'Astrology / horoscopes': 'Spirit of Divination, Occult, Witchcraft',
      'Séances': 'Familiar Spirits, Spirit of Witchcraft',
      'Palmistry': 'Spirit of Divination, Familiar Spirits',
      'Black magic': 'Spirit of Witchcraft, Antichrist',
      'Clairvoyance / psychics': 'Familiar Spirits, Deception — check for false spiritual gifts / perverted prophetic',
      'New Age movement': 'Familiar Spirits, False Religion, Deception, Divination',
      'Reincarnation / past lives': 'Familiar Spirits, Deception, False Religion',
      'Crystals': 'Spirit of Divination, Occult',
      'Demon worship': 'Familiar Spirits, Witchcraft, Antichrist — PRIORITY',
      'Spirit guides': 'Familiar Spirits, Spirit of Divination — PRIORITY. Cast out spirit guide.',
      'Astral travel': 'Spirit of Astral Projection, Familiar Spirits',
      'Transcendental Meditation': 'Spirits that entered during passive mind state. False religion, Hinduism, Idolatry. Renounce mantra — may be demonic name.',
      'Yoga': 'False religion, Hinduism, Idolatry. Each position invokes a demon. Repent and renounce each position.',
      'Martial arts': 'Eastern religions, Spirits of anger, violence, murder, idolatry, control.',
      'Halloween / Mardi Gras celebrations': 'Divination, Occult, Witchcraft, Idolatry, Familiar Spirits, Voodoo.',
      'Voodoo / firewalking': 'Voodoo Spirits, Witchcraft — PRIORITY',
    }
    occult.forEach(act => {
      const spirit = occultMap[act] || 'Familiar Spirits, Divination — research specific activity'
      catC.push(`${act} → ${spirit}`)
    })
  }

  const cults = arr('C - Cult Involvement').filter(c => c !== 'None')
  if (cults.length) {
    catC.push(`Cult/Society involvement (${cults.join(', ')}) → Spirits of False Religion, Doubt & Unbelief, Deception, and spirits named after each cult. Renounce any oaths. Break soul ties to group members/leaders.`)
  }

  const freemasonry = str('C - Freemasonry')
  if (freemasonry && !['No', "Don't know"].includes(freemasonry)) {
    catC.push(`Freemasonry (${freemasonry}) → Spirits of Freemasonry. Check if person suffers: Apathy, Hardness of Emotion, Confusion, Financial Disaster, Skepticism, Comprehension Difficulties, Unbelief, Doubt, Infirmities, Frequent Sickness, Allergies. Ensure any regalia/memorabilia is destroyed.`)
    priority.push('⚠ FREEMASONRY DETECTED — Deal with this stronghold before other deliverance. Break oaths made in Masonic rituals.')
  }

  const curses = str('C - Curses')
  if (curses && ['Yes','Possibly'].some(v => curses.includes(v))) {
    catC.push(`Curses (${curses}) → Look for generational patterns (premature death, suicides, blindness, etc.). All curses must be broken and oppressive demons cast out BEFORE praying for cleansing and healing.`)
    priority.push('⚠ POSSIBLE CURSE — Break generational curse FIRST before other deliverance.')
  }

  const occultObjects = str('C - Occult Objects')
  if (occultObjects && occultObjects.includes('still have')) {
    catC.push('Occult objects still in possession → Ensure person destroys ALL items before deliverance. Spirits of Divination, Occult, Witchcraft associated with specific items.')
    priority.push('⚠ OCCULT OBJECTS STILL IN HOME — Must be destroyed before deliverance can take hold.')
  }

  if (catC.length) {
    lines.push('═══ CATEGORY C: WITCHCRAFT & OCCULT ═══')
    catC.forEach(l => lines.push('• ' + l))
    lines.push('  ⚑ STRONGMAN: Familiar Spirits / Spirit of Witchcraft')
    lines.push('')
  }

  // ── CATEGORY D: SEXUAL ───────────────────────────────────────────────
  const catD: string[] = []

  const lust = arr('D - Lust Struggles').filter(s => s !== 'None')
  if (lust.length) {
    catD.push(`Lust struggles (${lust.join(', ')}) → Strongman of Perversion and Lust. Check for hereditary lust in family. Look for entry points and close them.`)
    if (arrHas('D - Lust Struggles', 'Homosexual')) {
      catD.push('Homosexual desires → Strongman of Perversion and Lust. Spirits of Homosexuality, Self-Rejection, Self-Hatred, Guilt & Shame. Break soul ties. Person must be willing to repent and stop activity.')
    }
    if (arrHas('D - Lust Struggles', 'Sexual dreams involving demonic presence')) {
      priority.push('⚠ INCUBUS/SUCCUBUS MANIFESTATION — Spirit of Incubus (male) or Succubus (female). May be familiar spirits or gained access through witchcraft/satanic worship. PRIORITY.')
    }
  }

  const porn = str('D - Pornography History')
  if (porn === 'Currently struggling') {
    catD.push('Pornography (current) → Strongman of Perversion and Lust. Spirits of Guilt & Shame, Bondage. Depending on content: homosexual spirits, violence, pedophilia. Person must repent and stop. Pray for cleansing and purging of memories.')
    priority.push('⚠ ACTIVE PORNOGRAPHY STRUGGLE — Person must commit to stop before deliverance can be effective.')
  } else if (porn === 'Past only — not current') {
    catD.push('Pornography (past) → Strongman of Lust, Guilt & Shame. Pray for cleansing and purging of memories. Forgiveness issues.')
  }

  const abuse = str('D - Abuse History')
  if (abuse && abuse !== 'No') {
    catD.push(`Sexual abuse history (${abuse}) → Strongman of Perversion and Lust. Forgive the perpetrator. Deal with: Anger, Hatred of opposite sex, Rejection, Fear, Guilt & Shame. Break soul tie with abuser. If pattern exists: Familiar spirit of lust and victim spirit.`)
    priority.push('⚠ SEXUAL ABUSE HISTORY — Requires special care. Forgiveness of perpetrator is essential. Break soul ties.')
  }

  if (catD.length) {
    lines.push('═══ CATEGORY D: SEXUAL SINS & BONDAGES ═══')
    catD.forEach(l => lines.push('• ' + l))
    lines.push('  ⚑ STRONGMAN: Strongman of Perversion and Lust')
    lines.push('')
  }

  // ── CATEGORY E: ADDICTIONS ───────────────────────────────────────────
  const catE: string[] = []

  const addictions = arr('E - Addictions').filter(a => a !== 'None')
  if (addictions.length) {
    catE.push(`Addictions (${addictions.join(', ')}) → Strongman of Bondage & Whoredoms. Spirits of Dependence, False Comfort, Escapism, Compulsion. First determine if person is TRULY willing to give up addiction and exercise self-discipline. If not, bind but do not cast out — allow to return when ready.`)
    if (addictions.some(a => ['Alcohol'].includes(a))) {
      catE.push('Alcohol → Spirits of Alcohol Dependence, Inability to Cope, Deception, Lying, Violence.')
    }
    if (addictions.some(a => ['Marijuana','Prescription drugs','Street drugs'].includes(a))) {
      catE.push('Drug addiction → Name the specific drug as a spirit. Deception, Control, plus problems drugs cause: Lust, Stealing, Violence, other addictions.')
    }
    if (addictions.some(a => ['Food / eating disorders'].includes(a))) {
      catE.push('Food/eating disorder → Spirit of Bondage linked with Spirit of Whoredom/Idolatry. Renounce both spirits, command them to unlink, cast out together. Also spirits of Anorexia, Bulimia: Death, Deception, Lies, Violence, deceptive body image, Fear of getting fat, rejection syndrome.')
    }
  }

  if (str('E - Family Addiction History') === 'Yes') {
    catE.push('Family addiction history → Inherited Strongman of Bondage. Cast out hereditary spirits first.')
  }

  if (catE.length) {
    lines.push('═══ CATEGORY E: ADDICTIONS & BONDAGES ═══')
    catE.forEach(l => lines.push('• ' + l))
    lines.push('  ⚑ STRONGMAN: Strongman of Bondage / Whoredoms')
    lines.push('')
  }

  // ── CATEGORY F/G: BACKGROUND & PHYSICAL ─────────────────────────────
  const catFG: string[] = []

  const counterCulture = arr('F - Counter Culture').filter(c => c !== 'None')
  if (counterCulture.length) {
    catFG.push(`Counter-culture (${counterCulture.join(', ')}) → Spirits of Idolatry, Lust, Immorality, Pride, Drugs, Rebellion, Antisocial Aggression. Renounce any oaths taken to the group. Break soul ties to group members/leaders. Dissolve any covenants made.`)
  }

  if (str('G - Chronic Illness')) {
    catFG.push(`Chronic illness / physical conditions → Strongman of Infirmity. Check for family curses causing hereditary impairments. Curses must be broken BEFORE deliverance. After familiar spirits removed, pray for cleansing and healing. When praying for seizures or asthma — bind strongman tightly first.`)
  }

  if (str('G - Trauma History')) {
    catFG.push('Severe accidents / trauma → Pray trauma prayer. Break soul ties with anyone involved in accidents. Spirits of Fear, Death, Infirmity may have entered at point of trauma.')
  }

  if (has('G - Blood Transfusion', 'Received') || has('G - Blood Transfusion', 'Both')) {
    catFG.push('Received blood transfusion → Break soul ties with blood donor. Ask God to break soul ties with person whose blood was received.')
  }

  if (catFG.length) {
    lines.push('═══ CATEGORY F/G: BACKGROUND & PHYSICAL ═══')
    catFG.forEach(l => lines.push('• ' + l))
    lines.push('')
  }

  // ── SUGGESTED STRONGMEN & ORDER ─────────────────────────────────────
  const strongmen: string[] = []
  if (catA.length) strongmen.push('Strongman of Rejection')
  if (catB.length) strongmen.push('Strongman of Heaviness')
  if (catC.length) strongmen.push('Familiar Spirits / Witchcraft')
  if (catD.length) strongmen.push('Strongman of Perversion and Lust')
  if (catE.length) strongmen.push('Strongman of Bondage')
  if (str('C - Freemasonry') && !['No',"Don't know"].includes(str('C - Freemasonry'))) strongmen.unshift('⚑ Freemasonry Stronghold — DEAL FIRST')

  if (strongmen.length) {
    lines.push('═══ SUGGESTED DELIVERANCE ORDER ═══')
    strongmen.forEach((s, i) => lines.push(`${i + 1}. ${s}`))
    lines.push('')
  }

  // ── PRIORITY FLAGS AT TOP ────────────────────────────────────────────
  const output: string[] = []
  if (priority.length) {
    output.push('╔═══ PRIORITY FLAGS — ADDRESS FIRST ═══╗')
    priority.forEach(p => output.push(p))
    output.push('╚══════════════════════════════════════╝')
    output.push('')
  }

  output.push(...lines)

  if (output.length === 0) {
    return 'No specific spirits flagged from answers — review full intake manually. Always check for spirits of Rejection as baseline.'
  }

  return output.join('\n')
}

export const Route = createFileRoute('/api/submit-assessment')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireAuth(request)
        if (auth instanceof Response) return auth

        try {
          const data = await request.json()
          const sb = createClient(supabaseUrl!, supabaseServiceKey!)
          const flaggedSpiritsText = diagnoseFlaggedSpirits(data)

          const str = (val: any): string | null => {
            const s = val ? String(val).trim() : ''
            return s || null
          }
          const arr = (val: any): string | null => {
            if (!Array.isArray(val)) return null
            const joined = val.filter((v: string) => v !== 'None' && v !== 'None of these').join(', ')
            return joined || null
          }
          const boolVal = (val: any): boolean | null => {
            if (val === 'Yes' || val === true) return true
            if (val === 'No' || val === false) return false
            return null
          }

          const { data: inserted, error: insertError } = await sb
            .from('deliverance_assessments')
            .insert({
              created_by:               auth.userId,
              submitted_at:             new Date().toISOString(),
              // baseline
              first_name:               str(data['First Name']),
              email:                    str(data['Email']),
              age_range:                str(data['Age Range']),
              how_long_saved:           str(data['How Long Saved']),
              education_level:          str(data['Education Level']),
              church_background:        str(data['Church Background']),
              conversion_experience:    str(data['Conversion Experience']),
              prayer_life:              str(data['Prayer Life Description']),
              assurance_of_salvation:   str(data['Assurance of Salvation']),
              satisfied_with_walk:      str(data['Satisfied With Walk']),
              // A — rejection
              a_father_relationship:    str(data['A - Father Relationship']),
              a_mother_relationship:    str(data['A - Mother Relationship']),
              a_planned_child:          boolVal(data['A - Planned Child']),
              a_adopted:                str(data['A - Adopted']),
              a_parents_divorced:       str(data['A - Parents Divorced']),
              a_childhood_home_happy:   boolVal(data['A - Childhood Home Happy']),
              a_lonely_as_teenager:     str(data['A - Lonely As Teenager']),
              a_self_image:             arr(data['A - Self Image']),
              a_rejection_notes:        str(data['A - Rejection Notes']),
              // B — mental
              b_anxiety_depression:     arr(data['B - Anxiety Depression']),
              b_mental_notes:           str(data['B - Mental Notes']),
              b_occult_mind_notes:      arr(data['B - Occult Mind States']),
              b_suicide_history:        str(data['B - Suicide History']),
              b_fears:                  arr(data['B - Fears']),
              b_dreams_sleep:           str(data['B - Dreams Sleep']),
              // C — occult
              c_devil_pact:             str(data['C - Devil Pact']),
              c_occult_activities:      arr(data['C - Occult Activities']),
              c_cult_involvement:       arr(data['C - Cult Involvement']),
              c_freemasonry:            str(data['C - Freemasonry']),
              c_occult_objects:         str(data['C - Occult Objects']),
              c_occult_notes:           str(data['C - Occult Notes']),
              c_curses:                 str(data['C - Curses']),
              // D — sexual
              d_lust_struggles:         arr(data['D - Lust Struggles']),
              d_pornography_history:    str(data['D - Pornography History']),
              d_abuse_history:          str(data['D - Abuse History']),
              d_sexual_notes:           str(data['D - Sexual Notes']),
              // E — addiction
              e_addictions:             arr(data['E - Addictions']),
              e_family_addiction_history: str(data['E - Family Addiction History']),
              e_addiction_notes:        str(data['E - Addiction Notes']),
              // F — heritage-lite
              f_country_of_birth:       str(data['F - Country of Birth']),
              f_counter_culture:        arr(data['F - Counter Culture']),
              // G — physical/trauma
              g_chronic_illness:        str(data['G - Chronic Illness']),
              g_trauma_history:         str(data['G - Trauma History']),
              g_blood_transfusion:      str(data['G - Blood Transfusion']),
              // H — heritage/genealogy (previously dropped entirely)
              h_heritage_background:    str(data['H - Heritage Background']),
              h_family_religion:        arr(data['H - Family Religion']),
              h_family_occult:          str(data['H - Family Occult']),
              h_family_occult_notes:    str(data['H - Family Occult Notes']),
              h_generational_patterns:  arr(data['H - Generational Patterns']),
              h_family_covenants:       str(data['H - Family Covenants']),
              h_family_covenants_notes: str(data['H - Family Covenants Notes']),
              h_country_of_origin:      str(data['H - Country of Origin']),
              h_ancestral_renunciation: str(data['H - Ancestral Renunciation']),
              // I — inner healing (previously dropped entirely)
              i_earliest_fear_memory:   str(data['I - Earliest Fear Memory']),
              i_unresolved_trauma:      str(data['I - Unresolved Trauma']),
              i_unresolved_trauma_notes: str(data['I - Unresolved Trauma Notes']),
              i_emotional_age:          str(data['I - Emotional Age']),
              i_emotional_age_notes:    str(data['I - Emotional Age Notes']),
              i_dissociation:           arr(data['I - Dissociation']),
              i_triggers_present:       str(data['I - Triggers Present']),
              i_trigger_notes:          str(data['I - Trigger Notes']),
              i_identity_struggles:     arr(data['I - Identity Struggles']),
              i_jesus_met_me:           str(data['I - Jesus Met Me']),
              i_unforgiveness:          str(data['I - Unforgiveness']),
              i_unforgiveness_notes:    str(data['I - Unforgiveness Notes']),
              i_inner_vows:             str(data['I - Inner Vows']),
              i_inner_vows_notes:       str(data['I - Inner Vows Notes']),
              // free text
              own_words:                str(data['Own Words']),
              anything_else:            str(data['Anything Else']),
              // output — flagged spirits as single-element array (structured diagnostic block)
              flagged_spirits:          flaggedSpiritsText ? [flaggedSpiritsText] : null,
            })
            .select('id')
            .single()

          if (insertError) {
            console.error('[submit-assessment] insert error:', insertError.message)
            return Response.json({ error: insertError.message }, { status: 500 })
          }

          const newId = inserted.id

          // AI generation — same logic, writes back via Supabase update instead of Airtable PATCH
          try {
            const ownWordsText = str(data['Own Words']) || ''
            const anthropicKey = process.env.ANTHROPIC_API_KEY || ''

            if (anthropicKey && newId) {
              const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': anthropicKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: 'claude-haiku-4-5-20251001',
                  max_tokens: 1500,
                  messages: [{ role: 'user', content: `You are a seasoned deliverance minister writing intake notes. A person submitted an anonymous assessment. Generate three things.

INTAKE:
Their own words: ${ownWordsText}
Spiritual patterns: ${flaggedSpiritsText}

Generate ALL THREE sections separated exactly as shown:

===TITLE===
8-12 word plain-spoken title for this case — the way a pastor would label a file. No quotes. Direct. Example: "Years of rejection and rage with a wall in prayer"

===SUMMARY===
Write 2-3 short paragraphs about what this person is going through. Write like a pastor's handwritten notes — plain, warm, direct. No clinical phrases like "This individual presents with." Use natural language: "They are carrying...", "There is a pattern here of...", "This looks like..." — real minister voice. No bullet points. No headers. Leave out identifying details and explicit trauma/sexual specifics — name the spiritual root instead. End with one genuine sentence of hope.

===DRAFT RESPONSE===
A draft letter the minister can edit before sending. Pastoral tone — like a letter from a real person who prayed over this. Warm opening, plain identification of what appears to be at work spiritually (mention the spirits/strongmen naturally in the text, not as a list), 2-3 Scripture references woven in naturally like a pastor would mention them in conversation, a clear next step, and a real closing. Under 300 words. Not formal. Not AI-sounding.` }],
                }),
              })

              if (aiRes.ok) {
                const aiData = await aiRes.json()
                const fullText = aiData.content?.[0]?.text || ''

                const titleMatch = fullText.match(/===TITLE===\s*([\s\S]*?)(?===SUMMARY===|$)/)
                const summaryMatch = fullText.match(/===SUMMARY===\s*([\s\S]*?)(?===DRAFT RESPONSE===|$)/)
                const responseMatch = fullText.match(/===DRAFT RESPONSE===\s*([\s\S]*?)$/)

                const aiTitle = titleMatch?.[1]?.trim() || ''
                const aiSummary = summaryMatch?.[1]?.trim() || ''
                const aiDraftResponse = responseMatch?.[1]?.trim() || ''

                const updateFields: Record<string, string> = {}
                if (aiSummary) updateFields['ai_summary'] = aiSummary
                if (aiTitle) updateFields['published_title'] = aiTitle
                if (aiDraftResponse) updateFields['war_strategy'] = aiDraftResponse

                if (Object.keys(updateFields).length > 0) {
                  await sb
                    .from('deliverance_assessments')
                    .update(updateFields)
                    .eq('id', newId)
                }
              }
            }
          } catch (_) {
            // AI generation failed silently — submission still succeeds
          }

          return Response.json({ success: true })
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 })
        }
      },
    },
  },
})
