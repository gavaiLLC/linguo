import type { Extractor } from "../interfaces/extractor.js";
import type { Replacer } from "../interfaces/replacer.js";
import type { Formatter } from "../interfaces/formatter.js";
import type { ExtractionResult, ReplaceResult } from "../types.js";

export interface PipelineOptions {
  extractors: Extractor[];
  replacers: Replacer[];
  formatters: Formatter[];
}

/**
 * Orchestrates the extract → replace → format pipeline.
 * Matches files to the correct plugin by glob pattern.
 */
export class Pipeline {
  private extractors: Extractor[];
  private replacers: Replacer[];
  private formatters: Formatter[];

  constructor(options: PipelineOptions) {
    this.extractors = options.extractors;
    this.replacers = options.replacers;
    this.formatters = options.formatters;
  }

  /** Run all matching extractors on a source file. */
  extract(source: string, filePath: string): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    for (const extractor of this.extractors) {
      if (this.matchesPattern(filePath, extractor.filePatterns)) {
        results.push(...extractor.extract(source, filePath));
      }
    }
    return results;
  }

  /** Run the first matching replacer on a source file. */
  replace(source: string, extractions: ExtractionResult[], filePath: string): ReplaceResult {
    for (const replacer of this.replacers) {
      if (this.matchesPattern(filePath, replacer.filePatterns)) {
        return replacer.replace(source, extractions);
      }
    }
    return { output: source, modified: false };
  }

  /** Get the first formatter (used for reading/writing translation files). */
  getFormatter(): Formatter | undefined {
    return this.formatters[0];
  }

  /** Simple glob matching: supports *.ext patterns. */
  private matchesPattern(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern.startsWith("*.")) {
        const ext = pattern.slice(1);
        if (filePath.endsWith(ext)) return true;
      } else if (pattern === filePath) {
        return true;
      }
    }
    return false;
  }
}
