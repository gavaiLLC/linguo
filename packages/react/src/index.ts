import { createReactExtractor } from "./extractor.js";
import { createReactReplacer } from "./replacer.js";

export function reactExtractor() {
  return createReactExtractor();
}

export function reactReplacer() {
  return createReactReplacer();
}
