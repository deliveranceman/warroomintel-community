CREATE TABLE arsenal_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spirit_id uuid NOT NULL REFERENCES spirits(id) ON DELETE CASCADE,
  lead_type text NOT NULL,           -- 'prayer'|'protocol'|'renunciation'|'sequence'|'trigger_question'|'aftercare'|'operational_note'
  content text NOT NULL,             -- the actual lead content
  source_excerpt text,               -- supporting quote from source
  confidence smallint                -- 1-5 from Layer 2
    CHECK (confidence BETWEEN 1 AND 5),
  source_suggestion_id uuid          -- FK to library_enrichment_suggestions for audit trail
    REFERENCES library_enrichment_suggestions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text                    -- userId from verified Clerk record
);

CREATE INDEX arsenal_leads_spirit_id_idx ON arsenal_leads(spirit_id);
CREATE INDEX arsenal_leads_lead_type_idx ON arsenal_leads(lead_type);
CREATE INDEX arsenal_leads_source_suggestion_id_idx ON arsenal_leads(source_suggestion_id);

COMMENT ON TABLE arsenal_leads IS
  'Layer 7 (Counter-strategies) fan-out destination. One row per extracted prayer/protocol/sequence/etc per spirit. source_suggestion_id is the audit handle for undo (delete derived rows + re-pending the suggestion).';
