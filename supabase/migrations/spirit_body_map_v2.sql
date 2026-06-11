-- ============================================================================
-- Spirit Body Map v2 — CORPVS-style atlas taxonomy
-- Run manually in Supabase (SQL editor). Idempotent-ish: uses IF NOT EXISTS /
-- ON CONFLICT so re-running is safe. Backend (service role) gates all access;
-- RLS denies everything to anon/authenticated by design.
--
-- Figure centerline x ~= 49.5. Left/right pairs mirror with x_right = 99 - x_left.
-- Coordinates are % of the figure box; admin "Calibrate Markers" tunes them live.
-- ============================================================================

-- ── TABLES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anatomy_regions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  region_key  text UNIQUE NOT NULL,            -- 'left_eye', 'heart', 'right_knee'
  display_name text NOT NULL,
  spiritual_tag text,                          -- one-line spiritual significance (replaces Latin)
  category    text NOT NULL,                   -- 'head_face','neck_throat','chest','abdomen','back','arms','hands','hips','legs','feet','organ'
  body_side   text DEFAULT 'center',           -- 'left','right','center'
  view        text NOT NULL DEFAULT 'front',   -- 'front','back','both'
  sex         text DEFAULT 'both',             -- 'male','female','both'
  x_percent   numeric NOT NULL,
  y_percent   numeric NOT NULL,
  fx_percent  numeric, fy_percent numeric,     -- optional female override
  overview    text DEFAULT '',                 -- manifestation summary (dossier body)
  sort_order  int DEFAULT 0,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS body_systems (
  system_key   text PRIMARY KEY,               -- 'nervous','endocrine',...
  display_name text NOT NULL,
  color_hex    text NOT NULL
);

CREATE TABLE IF NOT EXISTS region_systems (
  region_key text REFERENCES anatomy_regions(region_key) ON DELETE CASCADE,
  system_key text REFERENCES body_systems(system_key) ON DELETE CASCADE,
  PRIMARY KEY (region_key, system_key)
);

CREATE TABLE IF NOT EXISTS spirit_region_correlations (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  region_key           text REFERENCES anatomy_regions(region_key) ON DELETE CASCADE,
  spirit_name          text NOT NULL,
  airtable_record_id   text,
  correlation_strength int CHECK (correlation_strength BETWEEN 1 AND 5) DEFAULT 3,
  manifestation_type   text,
  scripture_reference  text,
  notes                text,
  created_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_src_region ON spirit_region_correlations(region_key);

-- ── RLS — service-role only (backend gates access; no anon/authenticated read) ─

ALTER TABLE anatomy_regions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_systems               ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_systems             ENABLE ROW LEVEL SECURITY;
ALTER TABLE spirit_region_correlations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role full access" ON anatomy_regions;
DROP POLICY IF EXISTS "service role full access" ON body_systems;
DROP POLICY IF EXISTS "service role full access" ON region_systems;
DROP POLICY IF EXISTS "service role full access" ON spirit_region_correlations;

CREATE POLICY "service role full access" ON anatomy_regions            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service role full access" ON body_systems               FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service role full access" ON region_systems             FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service role full access" ON spirit_region_correlations FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ── SEED: body_systems (12) ─────────────────────────────────────────────────

INSERT INTO body_systems (system_key, display_name, color_hex) VALUES
  ('nervous',         'Nervous',              '#9fb3c8'),
  ('endocrine',       'Endocrine',            '#c9a227'),
  ('cardio',          'Cardiovascular',       '#b85042'),
  ('respiratory',     'Respiratory',          '#cf8566'),
  ('digestive',       'Digestive',            '#cf8566'),
  ('lymphatic',       'Immune / Lymphatic',   '#9cc2b8'),
  ('musculoskeletal', 'Musculoskeletal',      '#d8c9a3'),
  ('reproductive',    'Reproductive',         '#b98ba5'),
  ('urinary',         'Urinary',              '#7ea88f'),
  ('skin',            'Skin / Integumentary', '#d8a47f'),
  ('skeletal',        'Skeletal',             '#d8c9a3'),
  ('muscular',        'Muscular',             '#b06a4d')
ON CONFLICT (system_key) DO UPDATE
  SET display_name = EXCLUDED.display_name, color_hex = EXCLUDED.color_hex;

-- ── SEED: anatomy_regions ───────────────────────────────────────────────────
-- columns: region_key, display_name, spiritual_tag, category, body_side, view, sex, x, y, sort
INSERT INTO anatomy_regions
  (region_key, display_name, spiritual_tag, category, body_side, view, sex, x_percent, y_percent, sort_order)
VALUES
  -- HEAD / FACE (front)
  ('brain',        'Brain',         'Seat of the mind — thoughts, imaginations, strongholds', 'head_face', 'center', 'front', 'both', 49.4, 5.6, 10),
  ('cranium',      'Cranium',       'Covering of the mind — headship and authority',          'head_face', 'center', 'front', 'both', 49.5, 10.2, 11),
  ('forehead',     'Forehead',      'Mark of allegiance — seal of God or of the world',       'head_face', 'center', 'front', 'both', 49.5, 8.0, 12),
  ('left_eye',     'Left Eye',      'Gate of perception — lust of the eyes, vision',          'head_face', 'left',   'front', 'both', 47.5, 8.5, 13),
  ('right_eye',    'Right Eye',     'Gate of perception — lust of the eyes, vision',          'head_face', 'right',  'front', 'both', 51.5, 8.5, 14),
  ('left_ear',     'Left Ear',      'Gate of hearing — what voices are given audience',       'head_face', 'left',   'front', 'both', 44.5, 9.5, 15),
  ('right_ear',    'Right Ear',     'Gate of hearing — what voices are given audience',       'head_face', 'right',  'front', 'both', 54.5, 9.5, 16),
  ('nose',         'Nose',          'Breath and discernment — the spirit of life',            'head_face', 'center', 'front', 'both', 49.5, 9.5, 17),
  ('mouth_jaw',    'Mouth / Jaw',   'Gate of the tongue — death and life in its power',       'head_face', 'center', 'front', 'both', 49.5, 11.5, 18),
  -- NECK / THROAT (front)
  ('throat',       'Throat',        'Voice and confession — what is spoken into being',       'neck_throat', 'center', 'front', 'both', 50.6, 18.8, 20),
  ('thyroid',      'Thyroid',       'Regulator — striving, anxiety, suppressed voice',        'neck_throat', 'center', 'front', 'both', 49.2, 16.4, 21),
  ('cervical_spine','Cervical Spine','Stiff-necked rebellion — submission to authority',      'neck_throat', 'center', 'both',  'both', 49.2, 14.2, 22),
  ('neck_lymph',   'Neck Lymph Nodes','Filtration of defilement — hidden infection',          'neck_throat', 'center', 'front', 'both', 45.8, 13.6, 23),
  ('clavicle',     'Clavicle',      'Yoke line — burdens borne and bondages carried',         'neck_throat', 'center', 'front', 'both', 42.0, 17.4, 24),
  -- CHEST (front)
  ('heart',        'Heart',         'Wellspring of life — the issues of life flow from it',    'chest', 'center', 'front', 'both', 52.6, 24.6, 30),
  ('sternum_ribcage','Sternum / Ribcage','Breastplate of righteousness — guarding the heart', 'chest', 'center', 'front', 'both', 55.5, 25.5, 31),
  ('left_lung',    'Left Lung',     'Breath of the Spirit — life or oppression',              'chest', 'left',  'front', 'both', 44.5, 21.5, 32),
  ('right_lung',   'Right Lung',    'Breath of the Spirit — life or oppression',              'chest', 'right', 'front', 'both', 54.5, 21.5, 33),
  ('left_breast',  'Left Breast',   'Nurture and womanhood — wounds to identity',             'chest', 'left',  'front', 'female', 44.0, 24.0, 34),
  ('right_breast', 'Right Breast',  'Nurture and womanhood — wounds to identity',             'chest', 'right', 'front', 'female', 55.0, 24.0, 35),
  ('armpit_lymph', 'Axillary Lymph Nodes','Hidden filtration — concealed defilement',         'chest', 'left',  'front', 'both', 38.6, 21.6, 36),
  -- ABDOMEN / ORGANS (front)
  ('solar_plexus', 'Solar Plexus',  'Seat of the soul — gut-level fear and control',          'abdomen', 'center', 'front', 'both', 49.5, 30.0, 40),
  ('liver',        'Liver',         'Anger and bitterness — the seat of wrath',               'organ', 'center', 'front', 'both', 47.0, 28.6, 41),
  ('stomach',      'Stomach',       'Appetite and anxiety — what is fed upon',                'organ', 'center', 'front', 'both', 52.0, 28.6, 42),
  ('pancreas',     'Pancreas',      'Sweetness and bitterness — striving and burnout',        'organ', 'center', 'front', 'both', 52.8, 30.6, 43),
  ('spleen',       'Spleen',        'Old anger and vengeance — held grievances',              'organ', 'center', 'front', 'both', 46.0, 30.6, 44),
  ('colon',        'Colon',         'Release and letting go — held offense, unforgiveness',   'organ', 'center', 'front', 'both', 45.0, 33.5, 45),
  ('small_intestine','Small Intestine','Discernment and assimilation — taking in truth',      'organ', 'center', 'front', 'both', 49.5, 36.6, 46),
  -- HIPS / PELVIS (front)
  ('pelvis',       'Pelvis',        'Foundation and stability — generational footings',       'hips', 'center', 'front', 'both', 49.5, 40.2, 50),
  ('bladder',      'Bladder',       'Release and control — fear and held tension',            'organ', 'center', 'front', 'both', 48.6, 44.3, 51),
  ('groin_lymph',  'Inguinal Lymph Nodes','Filtration at the gate of generations',            'hips', 'center', 'front', 'both', 44.8, 45.8, 52),
  ('left_hip',     'Left Hip',      'Walk and alignment — the way that is walked',            'hips', 'left',  'front', 'both', 44.5, 40.2, 53),
  ('right_hip',    'Right Hip',     'Walk and alignment — the way that is walked',            'hips', 'right', 'front', 'both', 54.5, 40.2, 54),
  ('uterus_ovaries','Uterus / Ovaries','Womb — covenant, fruitfulness, generational lines',   'organ', 'center', 'front', 'female', 49.5, 43.0, 55),
  ('prostate_testes','Prostate / Testes','Seed and lineage — covenant and generational lines','organ', 'center', 'front', 'male', 49.5, 46.0, 56),
  -- ARMS (front)
  ('left_deltoid', 'Left Deltoid',  'Strength to bear — burdens taken up',                    'arms', 'left',  'front', 'both', 34.6, 19.0, 60),
  ('right_deltoid','Right Deltoid', 'Strength to bear — burdens taken up',                    'arms', 'right', 'front', 'both', 64.4, 19.0, 61),
  ('left_bicep',   'Left Bicep',    'Self-effort and striving — the arm of flesh',            'arms', 'left',  'front', 'both', 31.8, 26.0, 62),
  ('right_bicep',  'Right Bicep',   'Self-effort and striving — the arm of flesh',            'arms', 'right', 'front', 'both', 67.2, 26.0, 63),
  ('left_forearm', 'Left Forearm',  'Labor and reach — the work of the hands',                'arms', 'left',  'front', 'both', 29.2, 37.0, 64),
  ('right_forearm','Right Forearm', 'Labor and reach — the work of the hands',                'arms', 'right', 'front', 'both', 69.8, 37.0, 65),
  -- HANDS (front)
  ('left_hand',    'Left Hand',     'Works and covenant — what the hands have made',          'hands', 'left',  'front', 'both', 27.8, 47.0, 70),
  ('right_hand',   'Right Hand',    'Works and covenant — what the hands have made',          'hands', 'right', 'front', 'both', 71.2, 47.0, 71),
  -- LEGS (front)
  ('left_quadricep','Left Thigh',   'Standing and strength — the way one stands',             'legs', 'left',  'front', 'both', 42.0, 55.0, 80),
  ('right_quadricep','Right Thigh', 'Standing and strength — the way one stands',             'legs', 'right', 'front', 'both', 57.0, 55.0, 81),
  ('left_knee',    'Left Knee',     'Bowing and submission — to whom the knee bends',         'legs', 'left',  'front', 'both', 42.2, 63.0, 82),
  ('right_knee',   'Right Knee',    'Bowing and submission — to whom the knee bends',         'legs', 'right', 'front', 'both', 56.8, 63.0, 83),
  ('left_lower_leg','Left Lower Leg','Endurance and walk — the long road',                    'legs', 'left',  'front', 'both', 41.0, 75.0, 84),
  ('right_lower_leg','Right Lower Leg','Endurance and walk — the long road',                  'legs', 'right', 'front', 'both', 58.0, 75.0, 85),
  -- FEET (front)
  ('left_foot',    'Left Foot',     'Standing and going — feet shod with the gospel',         'feet', 'left',  'front', 'both', 40.6, 90.0, 90),
  ('right_foot',   'Right Foot',    'Standing and going — feet shod with the gospel',         'feet', 'right', 'front', 'both', 58.4, 90.0, 91),

  -- ── BACK ──
  ('occiput',      'Occiput',       'Back of the mind — what is set behind, the past',        'head_face', 'center', 'back', 'both', 49.4, 6.6, 110),
  ('trapezius',    'Trapezius',     'Yoke of burdens — the weight carried on the shoulders',  'back', 'center', 'back', 'both', 49.2, 14.0, 111),
  ('left_scapula', 'Left Shoulder Blade','Wings and covering — strength of the back',         'back', 'left',  'back', 'both', 40.6, 19.0, 112),
  ('right_scapula','Right Shoulder Blade','Wings and covering — strength of the back',        'back', 'right', 'back', 'both', 58.4, 19.0, 113),
  ('thoracic_spine','Thoracic Spine','Backbone and uprightness — structural integrity',       'back', 'center', 'back', 'both', 49.2, 23.5, 114),
  ('left_kidney',  'Left Kidney',   'Hidden judgment — secret motives, fear tested',          'organ', 'left',  'back', 'both', 44.6, 29.2, 115),
  ('right_kidney', 'Right Kidney',  'Hidden judgment — secret motives, fear tested',          'organ', 'right', 'back', 'both', 54.4, 29.2, 116),
  ('lumbar_spine', 'Lumbar Spine',  'Loins of strength — where strength is girded',           'back', 'center', 'back', 'both', 49.2, 31.5, 117),
  ('sacrum',       'Sacrum',        'Foundation seat — the base of the spine, foundations',   'back', 'center', 'back', 'both', 49.2, 38.0, 118),
  ('tailbone',     'Tailbone',      'Root and survival — base fear, generational footing',    'back', 'center', 'back', 'both', 49.2, 41.0, 119),
  ('left_gluteal', 'Left Gluteal',  'Seat of rest — where one sits, slothfulness',            'hips', 'left',  'back', 'both', 44.8, 43.5, 120),
  ('right_gluteal','Right Gluteal', 'Seat of rest — where one sits, slothfulness',            'hips', 'right', 'back', 'both', 54.2, 43.5, 121),
  ('left_tricep',  'Left Tricep',   'Pushing strength — striving and self-defense',           'arms', 'left',  'back', 'both', 33.0, 27.0, 122),
  ('right_tricep', 'Right Tricep',  'Pushing strength — striving and self-defense',           'arms', 'right', 'back', 'both', 66.0, 27.0, 123),
  ('left_posterior_forearm', 'Left Posterior Forearm','Labor borne — the unseen work',        'arms', 'left',  'back', 'both', 30.4, 38.0, 124),
  ('right_posterior_forearm','Right Posterior Forearm','Labor borne — the unseen work',       'arms', 'right', 'back', 'both', 68.6, 38.0, 125),
  ('left_hamstring','Left Hamstring','Backward pull — being held back, restraint',            'legs', 'left',  'back', 'both', 43.0, 52.0, 126),
  ('right_hamstring','Right Hamstring','Backward pull — being held back, restraint',          'legs', 'right', 'back', 'both', 56.0, 52.0, 127),
  ('left_calf',    'Left Calf',     'Stamina and flight — strength to flee or stand',         'legs', 'left',  'back', 'both', 42.0, 68.0, 128),
  ('right_calf',   'Right Calf',    'Stamina and flight — strength to flee or stand',         'legs', 'right', 'back', 'both', 57.0, 68.0, 129),
  ('left_achilles','Left Achilles', 'Hidden weakness — the vulnerable heel',                  'feet', 'left',  'back', 'both', 42.6, 85.0, 130),
  ('right_achilles','Right Achilles','Hidden weakness — the vulnerable heel',                 'feet', 'right', 'back', 'both', 56.4, 85.0, 131),

  -- WHOLE-BODY
  ('skin',         'Skin',          'Covering and boundary — defilement, shame, what touches','organ', 'center', 'both', 'both', 49.5, 2.0, 200)
ON CONFLICT (region_key) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  spiritual_tag = EXCLUDED.spiritual_tag,
  category      = EXCLUDED.category,
  body_side     = EXCLUDED.body_side,
  view          = EXCLUDED.view,
  sex           = EXCLUDED.sex,
  x_percent     = EXCLUDED.x_percent,
  y_percent     = EXCLUDED.y_percent,
  sort_order    = EXCLUDED.sort_order;

-- ── SEED: region_systems links ──────────────────────────────────────────────

INSERT INTO region_systems (region_key, system_key) VALUES
  ('brain','nervous'), ('cranium','skeletal'), ('forehead','nervous'),
  ('left_eye','nervous'), ('right_eye','nervous'), ('left_ear','nervous'), ('right_ear','nervous'),
  ('nose','respiratory'), ('mouth_jaw','digestive'),
  ('throat','respiratory'), ('throat','digestive'), ('thyroid','endocrine'),
  ('cervical_spine','skeletal'), ('cervical_spine','nervous'),
  ('neck_lymph','lymphatic'), ('clavicle','skeletal'),
  ('heart','cardio'), ('sternum_ribcage','skeletal'),
  ('left_lung','respiratory'), ('right_lung','respiratory'),
  ('left_breast','reproductive'), ('right_breast','reproductive'),
  ('armpit_lymph','lymphatic'),
  ('solar_plexus','nervous'), ('liver','digestive'), ('stomach','digestive'),
  ('pancreas','endocrine'), ('pancreas','digestive'), ('spleen','lymphatic'),
  ('colon','digestive'), ('small_intestine','digestive'),
  ('pelvis','skeletal'), ('bladder','urinary'), ('groin_lymph','lymphatic'),
  ('left_hip','skeletal'), ('right_hip','skeletal'),
  ('uterus_ovaries','reproductive'), ('prostate_testes','reproductive'),
  ('left_deltoid','muscular'), ('right_deltoid','muscular'),
  ('left_bicep','muscular'), ('right_bicep','muscular'),
  ('left_forearm','muscular'), ('right_forearm','muscular'),
  ('left_hand','musculoskeletal'), ('right_hand','musculoskeletal'),
  ('left_quadricep','muscular'), ('right_quadricep','muscular'),
  ('left_knee','musculoskeletal'), ('right_knee','musculoskeletal'),
  ('left_lower_leg','muscular'), ('right_lower_leg','muscular'),
  ('left_foot','musculoskeletal'), ('right_foot','musculoskeletal'),
  ('occiput','skeletal'), ('trapezius','muscular'),
  ('left_scapula','skeletal'), ('right_scapula','skeletal'),
  ('thoracic_spine','skeletal'), ('thoracic_spine','nervous'),
  ('left_kidney','urinary'), ('right_kidney','urinary'),
  ('lumbar_spine','skeletal'), ('lumbar_spine','nervous'),
  ('sacrum','skeletal'), ('tailbone','skeletal'),
  ('left_gluteal','muscular'), ('right_gluteal','muscular'),
  ('left_tricep','muscular'), ('right_tricep','muscular'),
  ('left_posterior_forearm','muscular'), ('right_posterior_forearm','muscular'),
  ('left_hamstring','muscular'), ('right_hamstring','muscular'),
  ('left_calf','muscular'), ('right_calf','muscular'),
  ('left_achilles','musculoskeletal'), ('right_achilles','musculoskeletal'),
  ('skin','skin')
ON CONFLICT (region_key, system_key) DO NOTHING;
