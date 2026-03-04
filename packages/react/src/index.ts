import { createReactExtractor } from "./extractor.js";
import { createReactReplacer, type ReactReplacerOptions } from "./replacer.js";

export type { ReactReplacerOptions };

export function reactExtractor() {
  return createReactExtractor();
}

export function reactReplacer(options?: ReactReplacerOptions) {
  return createReactReplacer(options);
}
