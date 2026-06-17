// Free-text body region phrase → canonical anatomy_regions.region_key crosswalk.
// Canonical region_keys are fixed by the anatomy_regions table (80 rows).
// DO NOT add region_keys that do not exist in that table.
//
// resolveRegion() is used by applySpiritRegions to fan-out Layer 2 body-region
// payloads into spirit_regions rows before any endpoint imports this file.

export type RegionCrosswalk = Record<string, string[]>

// Keys must be lowercased (resolveRegion lowercases input before lookup).
// Values must be canonical region_keys from anatomy_regions.
// Arrays represent multi-region mappings (e.g. bilateral or compound terms).
export const REGION_SYNONYMS: RegionCrosswalk = {
  // ── Feet ──────────────────────────────────────────────────────────────────
  'achilles':              ['left_achilles', 'right_achilles'],
  'achilles tendon':       ['left_achilles', 'right_achilles'],
  'feet':                  ['left_foot', 'right_foot'],
  'foot':                  ['left_foot', 'right_foot'],
  'left achilles':         ['left_achilles'],
  'left foot':             ['left_foot'],
  'right achilles':        ['right_achilles'],
  'right foot':            ['right_foot'],

  // ── Hands ─────────────────────────────────────────────────────────────────
  'hand':                  ['left_hand', 'right_hand'],
  'hands':                 ['left_hand', 'right_hand'],
  'left hand':             ['left_hand'],
  'right hand':            ['right_hand'],

  // ── Arms ──────────────────────────────────────────────────────────────────
  'bicep':                 ['left_bicep', 'right_bicep'],
  'biceps':                ['left_bicep', 'right_bicep'],
  'deltoid':               ['left_deltoid', 'right_deltoid'],
  'deltoids':              ['left_deltoid', 'right_deltoid'],
  'elbow':                 ['left_forearm', 'right_forearm'],
  'forearm':               ['left_forearm', 'right_forearm'],
  'forearms':              ['left_forearm', 'right_forearm'],
  'left arm':              ['left_shoulder', 'left_deltoid', 'left_bicep', 'left_forearm'],
  'left bicep':            ['left_bicep'],
  'left deltoid':          ['left_deltoid'],
  'left forearm':          ['left_forearm'],
  'left posterior forearm': ['left_posterior_forearm'],
  'left shoulder':         ['left_shoulder'],
  'left tricep':           ['left_tricep'],
  'right arm':             ['right_shoulder', 'right_deltoid', 'right_bicep', 'right_forearm'],
  'right bicep':           ['right_bicep'],
  'right deltoid':         ['right_deltoid'],
  'right forearm':         ['right_forearm'],
  'right posterior forearm': ['right_posterior_forearm'],
  'right shoulder':        ['right_shoulder'],
  'right tricep':          ['right_tricep'],
  'shoulder':              ['left_shoulder', 'right_shoulder'],
  'shoulders':             ['left_shoulder', 'right_shoulder'],
  'tricep':                ['left_tricep', 'right_tricep'],
  'triceps':               ['left_tricep', 'right_tricep'],
  'upper arm':             ['left_bicep', 'right_bicep'],
  'upper arms':            ['left_bicep', 'right_bicep'],
  'wrist':                 ['left_hand', 'right_hand'],

  // ── Legs ──────────────────────────────────────────────────────────────────
  'calf':                  ['left_calf', 'right_calf'],
  'calves':                ['left_calf', 'right_calf'],
  'hamstring':             ['left_hamstring', 'right_hamstring'],
  'hamstrings':            ['left_hamstring', 'right_hamstring'],
  'knee':                  ['left_knee', 'right_knee'],
  'knees':                 ['left_knee', 'right_knee'],
  'left calf':             ['left_calf'],
  'left hamstring':        ['left_hamstring'],
  'left knee':             ['left_knee'],
  'left lower leg':        ['left_lower_leg'],
  'left quadricep':        ['left_quadricep'],
  'left shin':             ['left_lower_leg'],
  'left thigh':            ['left_quadricep'],
  'lower leg':             ['left_lower_leg', 'right_lower_leg'],
  'lower legs':            ['left_lower_leg', 'right_lower_leg'],
  'quadricep':             ['left_quadricep', 'right_quadricep'],
  'quadriceps':            ['left_quadricep', 'right_quadricep'],
  'right calf':            ['right_calf'],
  'right hamstring':       ['right_hamstring'],
  'right knee':            ['right_knee'],
  'right lower leg':       ['right_lower_leg'],
  'right quadricep':       ['right_quadricep'],
  'right shin':            ['right_lower_leg'],
  'right thigh':           ['right_quadricep'],
  'shin':                  ['left_lower_leg', 'right_lower_leg'],
  'shins':                 ['left_lower_leg', 'right_lower_leg'],
  'thigh':                 ['left_quadricep', 'right_quadricep'],
  'thighs':                ['left_quadricep', 'right_quadricep'],

  // ── Hips ──────────────────────────────────────────────────────────────────
  'buttock':               ['left_gluteal', 'right_gluteal'],
  'buttocks':              ['left_gluteal', 'right_gluteal'],
  'glute':                 ['left_gluteal', 'right_gluteal'],
  'glutes':                ['left_gluteal', 'right_gluteal'],
  'gluteal':               ['left_gluteal', 'right_gluteal'],
  'groin':                 ['groin_lymph'],
  'groin lymph':           ['groin_lymph'],
  'hip':                   ['left_hip', 'right_hip'],
  'hips':                  ['left_hip', 'right_hip'],
  'left gluteal':          ['left_gluteal'],
  'left hip':              ['left_hip'],
  'loins':                 ['pelvis', 'left_hip', 'right_hip'],
  'pelvis':                ['pelvis'],
  'pelvic':                ['pelvis'],
  'pelvic region':         ['pelvis'],
  'right gluteal':         ['right_gluteal'],
  'right hip':             ['right_hip'],

  // ── Back ──────────────────────────────────────────────────────────────────
  'cervical spine':        ['cervical_spine'],
  'coccyx':                ['tailbone'],
  'left scapula':          ['left_scapula'],
  'lower back':            ['lumbar_spine'],
  'lumbar':                ['lumbar_spine'],
  'lumbar spine':          ['lumbar_spine'],
  'mid back':              ['thoracic_spine'],
  'middle back':           ['thoracic_spine'],
  'right scapula':         ['right_scapula'],
  'sacrum':                ['sacrum'],
  'scapula':               ['left_scapula', 'right_scapula'],
  'shoulder blade':        ['left_scapula', 'right_scapula'],
  'shoulder blades':       ['left_scapula', 'right_scapula'],
  'spine':                 ['cervical_spine', 'thoracic_spine', 'lumbar_spine'],
  'tailbone':              ['tailbone'],
  'thoracic spine':        ['thoracic_spine'],
  'trapezius':             ['trapezius'],
  'traps':                 ['trapezius'],
  'upper back':            ['thoracic_spine'],

  // ── Abdomen / Organs ──────────────────────────────────────────────────────
  'abdomen':               ['solar_plexus', 'stomach'],
  'abdominal':             ['solar_plexus', 'stomach'],
  'adrenal':               ['left_adrenal', 'right_adrenal'],
  'adrenal glands':        ['left_adrenal', 'right_adrenal'],
  'belly':                 ['stomach', 'small_intestine'],
  'bladder':               ['bladder'],
  'bowels':                ['small_intestine', 'colon'],
  'colon':                 ['colon'],
  'gallbladder':           ['gallbladder'],
  'gut':                   ['stomach', 'small_intestine', 'colon'],
  'intestines':            ['small_intestine', 'colon'],
  'kidney':                ['left_kidney', 'right_kidney'],
  'kidneys':               ['left_kidney', 'right_kidney'],
  'large intestine':       ['colon'],
  'left adrenal':          ['left_adrenal'],
  'left kidney':           ['left_kidney'],
  'liver':                 ['liver'],
  'ovaries':               ['uterus_ovaries'],
  'pancreas':              ['pancreas'],
  'private parts':         ['prostate_testes', 'uterus_ovaries'],
  'prostate':              ['prostate_testes'],
  'reins':                 ['left_kidney', 'right_kidney'], // KJV "reins" = kidneys (Ps 7:9, Jer 17:10)
  'reproductive organs':   ['prostate_testes', 'uterus_ovaries'],
  'right adrenal':         ['right_adrenal'],
  'right kidney':          ['right_kidney'],
  'sexual organs':         ['prostate_testes', 'uterus_ovaries'],
  'skin':                  ['skin'],
  'small intestine':       ['small_intestine'],
  'solar plexus':          ['solar_plexus'],
  'spleen':                ['spleen'],
  'stomach':               ['stomach'],
  'testes':                ['prostate_testes'],
  'testicles':             ['prostate_testes'],
  'uterus':                ['uterus_ovaries'],
  'womb':                  ['uterus_ovaries'],

  // ── Chest ─────────────────────────────────────────────────────────────────
  'armpit':                ['armpit_lymph'],
  'armpit lymph':          ['armpit_lymph'],
  'breast':                ['left_breast', 'right_breast'],
  'breasts':               ['left_breast', 'right_breast'],
  'chest':                 ['heart', 'sternum_ribcage', 'left_lung', 'right_lung'],
  'heart':                 ['heart'],
  'left breast':           ['left_breast'],
  'left lung':             ['left_lung'],
  'lung':                  ['left_lung', 'right_lung'],
  'lungs':                 ['left_lung', 'right_lung'],
  'right breast':          ['right_breast'],
  'right lung':            ['right_lung'],
  'ribcage':               ['sternum_ribcage'],
  'ribs':                  ['sternum_ribcage'],
  'sternum':               ['sternum_ribcage'],
  'sternum ribcage':       ['sternum_ribcage'],

  // ── Neck / Throat ─────────────────────────────────────────────────────────
  'cervical':              ['cervical_spine'],
  'clavicle':              ['clavicle'],
  'collarbone':            ['clavicle'],
  'neck':                  ['throat', 'cervical_spine'],
  'neck lymph':            ['neck_lymph'],
  'throat':                ['throat'],
  // TODO Justin: "throat chakra" is chakra-system terminology from New Age/Eastern frameworks.
  // Retained here because it appears in some deliverance ministry literature as a shorthand
  // for throat-area affliction. Confirm whether this mapping is appropriate in WRI context.
  'throat chakra':         ['throat'],
  'thyroid':               ['thyroid'],
  'voice box':             ['throat'],

  // ── Head / Face ───────────────────────────────────────────────────────────
  'back of head':          ['occiput'],
  'back of the head':      ['occiput'],
  'brain':                 ['brain'],
  'cranium':               ['cranium'],
  // TODO Justin: "crown" as a ministry term can mean top of the head (cranium)
  // or carry royal/authority connotations. Mapped to cranium as anatomical best-fit.
  // Confirm if a spiritual authority dimension warrants a different treatment.
  'crown':                 ['cranium'],
  'ear':                   ['left_ear', 'right_ear'],
  'ears':                  ['left_ear', 'right_ear'],
  'eye':                   ['left_eye', 'right_eye'],
  'eyes':                  ['left_eye', 'right_eye'],
  'face':                  ['forehead', 'nose', 'mouth_jaw'],
  'forehead':              ['forehead'],
  'head':                  ['brain', 'cranium', 'forehead'],
  'jaw':                   ['mouth_jaw'],
  'left ear':              ['left_ear'],
  'left eye':              ['left_eye'],
  'mind':                  ['brain'],
  'mouth':                 ['mouth_jaw'],
  'mouth jaw':             ['mouth_jaw'],
  'nose':                  ['nose'],
  'occiput':               ['occiput'],
  'right ear':             ['right_ear'],
  'right eye':             ['right_eye'],
  'sinuses':               ['sinuses'],
  'skull':                 ['cranium'],
  'temple':                ['forehead'],
  'temples':               ['forehead'],
  // TODO Justin: "third eye" is occult/New Age terminology (brow chakra/pineal gland).
  // Some deliverance practitioners use it to describe enemy access through the forehead/mind gate.
  // Currently mapped to forehead as the closest anatomical region. Confirm or remove.
  'third eye':             ['forehead'],
  'thoughts':              ['brain'],
}

// Resolve free-text body region phrase to canonical region_keys.
// Returns [] on no match — caller decides how to handle unmapped terms.
export function resolveRegion(freeText: string): string[] {
  const normalized = freeText.toLowerCase().trim()

  // Direct lookup first
  if (REGION_SYNONYMS[normalized]) return REGION_SYNONYMS[normalized]

  // Naive de-plural: strip trailing 's' and retry
  const depluraled = normalized.endsWith('s') ? normalized.slice(0, -1) : null
  if (depluraled && REGION_SYNONYMS[depluraled]) return REGION_SYNONYMS[depluraled]

  return []
}
