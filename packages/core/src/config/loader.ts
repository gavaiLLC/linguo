import type { LinguoConfig } from "../types.js";
import { DEFAULT_EXCLUDE } from "./defaults.js";

/**
 * Type-safe config helper. Returns the config object as-is.
 * Used in linguo.config.ts for editor autocompletion.
 */
export function defineConfig(config: LinguoConfig): LinguoConfig {
  return config;
}

/** Resolve a user config by applying defaults for missing optional fields. */
export function resolveConfig(config: LinguoConfig): LinguoConfig {
  return {
    ...config,
    exclude: config.exclude ?? DEFAULT_EXCLUDE,
  };
}
