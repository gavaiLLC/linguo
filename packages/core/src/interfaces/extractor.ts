import type { ExtractionResult } from "../types.js";

/** Plugin interface for extracting user-facing strings from source files. */
export interface Extractor {
  /** Glob patterns for files this extractor handles */
  filePatterns: string[];
  /** Parse source code and return all extractable user-facing strings. */
  extract(source: string, filePath: string): ExtractionResult[];
}
