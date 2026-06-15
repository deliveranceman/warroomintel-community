// Checkpoint keys are prefixed with _ to distinguish in-flight state
// from the final result keys written on completion.
// Workers read these on resumption; they are stripped from result_json
// when the job reaches status='complete'.

export interface ResearchDropCheckpoint {
  _cursor:              number    // index of next window to process (0 = not started)
  _partial_collected:   any[]     // spirit_mentions accumulated across all runs so far
  _chunks_embedded:     boolean   // true once Stage 2 embedding has completed
  _total_input_tokens:  number
  _total_output_tokens: number
  _total_cost_usd:      number
  _scan_errors:         string[]
  _windows_total:       number
  _is_resumption:       boolean   // true on any run after the first
}

// Shape of result_json when the job is status='complete'.
// Must stay in sync with the final .update() in runResearchDropSpirits.
export interface ResearchDropResultJson {
  chunksEmbedded:    number
  windowsScanned:    number
  windowsNeeded:     number
  truncated:         boolean
  hardCapHit:        boolean
  mentionsFound:     number
  enrichSuggestions: number
  newCandidates:     number
  dupeSkipped:       number
  scanErrors:        number
  isAdversarial:     boolean
  sourceType:        string | null
}

// Budget constants. BUDGET_MS is the wall-clock limit per worker invocation.
// Leave 2 min of buffer before Netlify's 15-min background function ceiling.
export const BUDGET_MS        = 13 * 60 * 1000   // 13 minutes
export const SCAN_CONCURRENCY = 6                 // concurrent windows per batch
