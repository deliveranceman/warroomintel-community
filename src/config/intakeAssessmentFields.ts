// ============================================================================
// src/config/intakeAssessmentFields.ts
// ----------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH for the WRI intake assessment.
//
// Consumed by:
//   - The online intake form (renders questions in order)
//   - The fillable PDF generator (produces printable version)
//   - The save endpoint (maps answers to target_table + target_column)
//   - The anonymization endpoint (reads pii:false to know what crosses
//     into deliverance_assessments)
//
// Schema reference: admin_docs sort_order 361 (Intake Assessment stack).
//
// PHASE STATUS: SEED (2026-07-07)
//   - Identity block (case_files)        ✅ complete
//   - Salvation walk (intake_assessments) ✅ complete
//   - Category A (intake_assessments)    ✅ complete
//   - Categories B–I                     ⏳ follow-up prompt
//   - Nine child-table repeatable configs ⏳ follow-up prompt
//   - Catalog helpers (inner_vow / manifestation_sign) ⏳ follow-up prompt
// ============================================================================

export type FieldTargetTable =
  | 'case_files'
  | 'intake_assessments'
  | 'intake_assessment_siblings'
  | 'intake_assessment_children'
  | 'intake_assessment_marriages'
  | 'intake_assessment_forgiveness_entries'
  | 'intake_assessment_soul_ties'
  | 'intake_assessment_lived_locations'
  | 'intake_assessment_traveled_locations'
  | 'intake_assessment_inner_vows'
  | 'intake_assessment_manifestation_signs';

export type FieldInputType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select'
  | 'radio'
  | 'yes_no'                 // Yes / No radio
  | 'yes_no_details'         // Yes / No radio + companion details textarea revealed on Yes
  | 'catalog_checklist';     // multi-select from catalog table

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  id: string;                     // unique field key (snake_case, matches target_column when applicable)
  section: string;                // 'identity' | 'salvation' | 'a' | ...
  section_label: string;
  section_order: number;          // order of section in form
  order_in_section: number;       // order within section
  question: string;               // full question shown to congregant
  help?: string;                  // optional helper text below question
  input_type: FieldInputType;
  target_table: FieldTargetTable;
  target_column: string;          // exact DB column (matches migration)
  pii: boolean;                   // true = does NOT flow to deliverance_assessments during anonymization
  required?: boolean;
  options?: FieldOption[];
  catalog?: 'inner_vow' | 'manifestation_sign';
  paired_notes_field?: string;    // e.g. c_freemasonry paired with c_occult_notes as details box
  placeholder?: string;
}

export interface RepeatableTableDef {
  id: string;                     // section id (e.g. 'siblings')
  section_label: string;
  section_order: number;
  target_table: FieldTargetTable;
  min_rows: number;               // 0 = optional, 1 = at least one required
  fields: FieldDef[];             // per-row column definitions
}

export interface AssessmentConfig {
  version: string;
  scalar_fields: FieldDef[];
  repeatable_tables: RepeatableTableDef[];
}

// ============================================================================
// SCALAR FIELDS
// ============================================================================

export const INTAKE_ASSESSMENT_CONFIG: AssessmentConfig = {
  version: '2026-07-07-seed',
  scalar_fields: [
    // ------------------------------------------------------------------------
    // SECTION 1 · IDENTITY  (target: case_files, all PII)
    // ------------------------------------------------------------------------
    {
      id: 'first_name', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 1,
      question: 'First (Legal) Name',
      input_type: 'text', target_table: 'case_files', target_column: 'first_name',
      pii: true, required: true,
    },
    {
      id: 'middle_name', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 2,
      question: 'Middle Name(s)',
      input_type: 'text', target_table: 'case_files', target_column: 'middle_name',
      pii: true,
    },
    {
      id: 'last_name', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 3,
      question: 'Last Name',
      input_type: 'text', target_table: 'case_files', target_column: 'last_name',
      pii: true, required: true,
    },
    {
      id: 'maiden_name', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 4,
      question: 'Maiden Name / Any Prior Legal Names',
      help: 'Prior surnames carry weight for bloodline mapping. Include every one.',
      input_type: 'text', target_table: 'case_files', target_column: 'maiden_name',
      pii: true,
    },
    {
      id: 'nickname', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 5,
      question: 'Nickname / What people call you',
      input_type: 'text', target_table: 'case_files', target_column: 'nickname',
      pii: true,
    },
    {
      id: 'date_of_birth', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 6,
      question: 'Date of Birth',
      input_type: 'date', target_table: 'case_files', target_column: 'date_of_birth',
      pii: true, required: true,
    },
    {
      id: 'sex', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 7,
      question: 'Sex',
      input_type: 'radio', target_table: 'case_files', target_column: 'sex',
      pii: true, required: true,
      options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
      ],
    },
    {
      id: 'email', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 8,
      question: 'Email',
      input_type: 'text', target_table: 'case_files', target_column: 'email',
      pii: true, required: true,
    },
    {
      id: 'phone', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 9,
      question: 'Phone',
      input_type: 'text', target_table: 'case_files', target_column: 'phone',
      pii: true,
    },
    {
      id: 'address_line1', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 10,
      question: 'Street Address',
      input_type: 'text', target_table: 'case_files', target_column: 'address_line1',
      pii: true,
    },
    {
      id: 'address_line2', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 11,
      question: 'Address Line 2 (apt, unit, etc.)',
      input_type: 'text', target_table: 'case_files', target_column: 'address_line2',
      pii: true,
    },
    {
      id: 'city', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 12,
      question: 'City',
      input_type: 'text', target_table: 'case_files', target_column: 'city',
      pii: true,
    },
    {
      id: 'state', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 13,
      question: 'State',
      input_type: 'text', target_table: 'case_files', target_column: 'state',
      pii: true,
    },
    {
      id: 'zip', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 14,
      question: 'ZIP Code',
      input_type: 'text', target_table: 'case_files', target_column: 'zip',
      pii: true,
    },
    {
      id: 'country', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 15,
      question: 'Country',
      input_type: 'text', target_table: 'case_files', target_column: 'country',
      pii: true,
    },
    {
      id: 'marital_status', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 16,
      question: 'Marital Status',
      input_type: 'radio', target_table: 'case_files', target_column: 'marital_status',
      pii: true,
      options: [
        { value: 'single', label: 'Single' },
        { value: 'married', label: 'Married' },
        { value: 'divorced', label: 'Divorced' },
        { value: 'remarried', label: 'Remarried' },
        { value: 'widowed', label: 'Widowed' },
      ],
    },
    {
      id: 'times_married', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 17,
      question: 'How many times have you been married?',
      input_type: 'number', target_table: 'case_files', target_column: 'times_married',
      pii: true,
    },
    {
      id: 'occupation', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 18,
      question: 'Current Profession / Occupation',
      input_type: 'text', target_table: 'case_files', target_column: 'occupation',
      pii: true,
    },
    {
      id: 'education_level', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 19,
      question: 'Highest Level of Education Completed',
      help: 'Grade / degree / trade certification, etc.',
      input_type: 'text', target_table: 'case_files', target_column: 'education_level',
      pii: true,
    },
    {
      id: 'home_church', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 20,
      question: 'Home Church',
      input_type: 'text', target_table: 'case_files', target_column: 'home_church',
      pii: true,
    },
    {
      id: 'pastor_name', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 21,
      question: "Pastor's Name",
      input_type: 'text', target_table: 'case_files', target_column: 'pastor_name',
      pii: true,
    },
    {
      id: 'pastor_phone', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 22,
      question: "Pastor's Phone",
      input_type: 'text', target_table: 'case_files', target_column: 'pastor_phone',
      pii: true,
    },
    {
      id: 'emergency_contact_name', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 23,
      question: 'Emergency Contact Name',
      input_type: 'text', target_table: 'case_files', target_column: 'emergency_contact_name',
      pii: true,
    },
    {
      id: 'emergency_contact_phone', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 24,
      question: 'Emergency Contact Phone',
      input_type: 'text', target_table: 'case_files', target_column: 'emergency_contact_phone',
      pii: true,
    },
    {
      id: 'preferred_contact_method', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 25,
      question: 'Preferred Contact Method',
      input_type: 'radio', target_table: 'case_files', target_column: 'preferred_contact_method',
      pii: true,
      options: [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone' },
        { value: 'text', label: 'Text' },
      ],
    },
    {
      id: 'best_time_to_schedule', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 26,
      question: 'What is the best time to schedule your deliverance?',
      input_type: 'radio', target_table: 'case_files', target_column: 'best_time_to_schedule',
      pii: true,
      options: [
        { value: 'weekday', label: 'Weekday' },
        { value: 'evening', label: 'Evening' },
        { value: 'weekend', label: 'Weekend' },
      ],
    },
    {
      id: 'height_in', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 27,
      question: 'Height (inches)',
      input_type: 'number', target_table: 'case_files', target_column: 'height_in',
      pii: true,
    },
    {
      id: 'weight_lb', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 28,
      question: 'Weight (lb)',
      input_type: 'number', target_table: 'case_files', target_column: 'weight_lb',
      pii: true,
    },
    {
      id: 'physician_name', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 29,
      question: "Physician's Name",
      input_type: 'text', target_table: 'case_files', target_column: 'physician_name',
      pii: true,
    },
    {
      id: 'current_medications', section: 'identity', section_label: 'Personal Information',
      section_order: 1, order_in_section: 30,
      question: 'Current Medications',
      help: 'List all current prescription and over-the-counter medications.',
      input_type: 'textarea', target_table: 'case_files', target_column: 'current_medications',
      pii: true,
    },

    // ------------------------------------------------------------------------
    // SECTION 2 · SALVATION WALK  (target: intake_assessments, NOT pii)
    // ------------------------------------------------------------------------
    {
      id: 'how_long_saved', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 1,
      question: 'How long have you been saved?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'how_long_saved',
      pii: false,
    },
    {
      id: 'church_background', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 2,
      question: 'What is your church background?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'church_background',
      pii: false,
    },
    {
      id: 'conversion_experience', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 3,
      question: 'Explain briefly your conversion experience. If you came to Christ as a teenager or older, was your life really changed?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'conversion_experience',
      pii: false,
    },
    {
      id: 'baptized_as_child', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 4,
      question: 'Were you baptized or dedicated as a child?',
      input_type: 'yes_no', target_table: 'intake_assessments', target_column: 'baptized_as_child',
      pii: false,
    },
    {
      id: 'baptized_after_conversion', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 5,
      question: "Were you baptized since you've been born again?",
      input_type: 'yes_no', target_table: 'intake_assessments', target_column: 'baptized_after_conversion',
      pii: false,
    },
    {
      id: 'baptized_when', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 6,
      question: 'When were you baptized after conversion?',
      input_type: 'text', target_table: 'intake_assessments', target_column: 'baptized_when',
      pii: false,
    },
    {
      id: 'one_word_jesus', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 7,
      question: 'In one word, who is Jesus Christ to you?',
      input_type: 'text', target_table: 'intake_assessments', target_column: 'one_word_jesus',
      pii: false,
    },
    {
      id: 'blood_of_jesus_means', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 8,
      question: 'What does the blood of Jesus mean to you?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'blood_of_jesus_means',
      pii: false,
    },
    {
      id: 'repentance_daily', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 9,
      question: 'Is repentance part of your Christian life?',
      input_type: 'yes_no_details', target_table: 'intake_assessments', target_column: 'repentance_daily',
      pii: false,
    },
    {
      id: 'prayer_life', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 10,
      question: 'What is your prayer life like?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'prayer_life',
      pii: false,
    },
    {
      id: 'assurance_of_salvation', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 11,
      question: 'Do you have assurance of salvation?',
      input_type: 'yes_no', target_table: 'intake_assessments', target_column: 'assurance_of_salvation',
      pii: false,
    },
    {
      id: 'doubt_unbelief_daily', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 12,
      question: 'Do you have a problem with doubt and unbelief in everyday Christian living?',
      input_type: 'yes_no_details', target_table: 'intake_assessments', target_column: 'doubt_unbelief_daily',
      pii: false,
    },
    {
      id: 'satisfied_with_walk', section: 'salvation', section_label: 'Your Christian Walk',
      section_order: 2, order_in_section: 13,
      question: 'Are you satisfied with your Christian walk? If not, how would you like to see it improve?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'satisfied_with_walk',
      pii: false,
    },

    // ------------------------------------------------------------------------
    // SECTION 3 · CATEGORY A — FAMILY & CHILDHOOD  (target: intake_assessments, NOT pii)
    // ------------------------------------------------------------------------
    {
      id: 'a_father_relationship', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 1,
      question: 'Describe your relationship with your father. Was he passive, strong, manipulative, or neither? Were you friends? Any special problems?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'a_father_relationship',
      pii: false,
    },
    {
      id: 'a_mother_relationship', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 2,
      question: 'Describe your relationship with your mother. Was she passive, strong, manipulative, or neither? Were you friends? Any special problems?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'a_mother_relationship',
      pii: false,
    },
    {
      id: 'a_planned_child', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 3,
      question: 'Were you a planned child? Were you the "right sex" for your parents?',
      help: 'Rejection often begins in the womb — this question opens that door.',
      input_type: 'yes_no_details', target_table: 'intake_assessments', target_column: 'a_planned_child',
      pii: false,
    },
    {
      id: 'a_adopted', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 4,
      question: 'Were you adopted? If yes, do you know anything about your biological parents?',
      input_type: 'yes_no_details', target_table: 'intake_assessments', target_column: 'a_adopted',
      pii: false,
    },
    {
      id: 'a_parents_divorced', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 5,
      question: 'Are your parents divorced or remarried? Are they living? Are they Christians?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'a_parents_divorced',
      pii: false,
    },
    {
      id: 'a_childhood_home_happy', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 6,
      question: 'Was yours a happy home during childhood? Describe briefly.',
      input_type: 'yes_no_details', target_table: 'intake_assessments', target_column: 'a_childhood_home_happy',
      pii: false,
    },
    {
      id: 'a_lonely_as_teenager', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 7,
      question: 'Were you lonely as a teenager?',
      input_type: 'yes_no_details', target_table: 'intake_assessments', target_column: 'a_lonely_as_teenager',
      pii: false,
    },
    {
      id: 'a_self_image', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 8,
      question: 'Tell us about your self-image. Do you feel low self-image, insecure, condemn yourself, hate yourself, feel worthless, feel like a failure, feel inferior, question your identity? Do you punish yourself mentally, emotionally, physically, or sexually?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'a_self_image',
      pii: false,
    },
    {
      id: 'a_rejection_notes', section: 'a', section_label: 'A. Family & Childhood',
      section_order: 3, order_in_section: 9,
      question: 'Any experiences of rejection, unwantedness, or being unloved that stand out?',
      input_type: 'textarea', target_table: 'intake_assessments', target_column: 'a_rejection_notes',
      pii: false,
    },
  ],
  repeatable_tables: [
    // Placeholder — seven repeatable configs (siblings, children, marriages,
    // forgiveness_entries, soul_ties, lived_locations, traveled_locations)
    // land in the follow-up prompt after shape approval.
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

export const getFieldsBySection = (section: string): FieldDef[] =>
  INTAKE_ASSESSMENT_CONFIG.scalar_fields.filter((f) => f.section === section);

export const getFieldsByTargetTable = (table: FieldTargetTable): FieldDef[] =>
  INTAKE_ASSESSMENT_CONFIG.scalar_fields.filter((f) => f.target_table === table);

export const getAnonymizableFields = (): FieldDef[] =>
  INTAKE_ASSESSMENT_CONFIG.scalar_fields.filter((f) => !f.pii);

export const getPiiFields = (): FieldDef[] =>
  INTAKE_ASSESSMENT_CONFIG.scalar_fields.filter((f) => f.pii);

export interface SectionSummary {
  section: string;
  section_label: string;
  section_order: number;
  field_count: number;
}

export const getSections = (): SectionSummary[] => {
  const map = new Map<string, SectionSummary>();
  for (const f of INTAKE_ASSESSMENT_CONFIG.scalar_fields) {
    const existing = map.get(f.section);
    if (existing) {
      existing.field_count += 1;
    } else {
      map.set(f.section, {
        section: f.section,
        section_label: f.section_label,
        section_order: f.section_order,
        field_count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.section_order - b.section_order);
};
