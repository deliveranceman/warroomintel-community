// Canonical projection of Layer2ExtractionInput.sourceMetadata.sourceType.
// Shared between candidate-run-layer2.ts, admin-retrofit-layer2.ts, and
// any future Layer-2-driven endpoint. Adding a new source_type value
// requires updating Layer2ExtractionInput's union first; this map will
// then fail to compile until the new key is added here.

import type { Layer2ExtractionInput } from './prompts/layer2Extraction'

export type SourceType = Layer2ExtractionInput['sourceMetadata']['sourceType']

export const SOURCE_TYPE_MAP: Record<string, SourceType> = {
  academic:   'academic',
  occult:     'occult',
  ministry:   'ministry',
  historical: 'historical',
  canonical:  'canonical',
}
