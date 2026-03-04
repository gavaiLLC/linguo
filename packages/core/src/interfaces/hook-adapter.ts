import type { ExtractionResult, TranslationResult, HookConfig } from "../types.js";

/** Plugin interface for integrating with AI coding tool hook systems. */
export interface HookAdapter {
  /** Name of the tool this adapter integrates with */
  name: string;
  /** Generate hook config files for the target tool. */
  install(): Promise<HookConfig[]>;
  /** Format extraction results into a prompt/request for the AI tool. */
  formatRequest(extracted: ExtractionResult[]): string;
  /** Parse the AI tool's translation response. */
  parseResponse(raw: string): TranslationResult[];
}
