import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { LinguoConfig } from "../types.js";
import { resolveConfig } from "../config/index.js";

/** Load linguo.config.ts from the current working directory or a specified path. */
export async function loadConfig(
  configPath?: string,
): Promise<LinguoConfig> {
  const cwd = process.cwd();
  const path = configPath
    ? resolve(configPath)
    : resolve(cwd, "linguo.config.ts");

  if (!existsSync(path)) {
    throw new Error(
      `Config not found: ${path}\nRun 'linguo init' to create one.`,
    );
  }

  const mod = (await import(path)) as { default: LinguoConfig };
  return resolveConfig(mod.default);
}
