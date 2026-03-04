import type { ExtractionResult, ReplaceResult } from "../types.js";

/** Plugin interface for replacing extracted strings with i18n calls. */
export interface Replacer {
  /** Glob patterns for files this replacer handles */
  filePatterns: string[];
  /** Replace original strings with i18n variable calls in source code. */
  replace(source: string, extractions: ExtractionResult[]): ReplaceResult;
  /** Import statements to auto-add when replacements are made. */
  imports?: string[];
}
