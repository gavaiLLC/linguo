import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import type { ExtractionResult } from "../../types.js";

export async function extract(
  globs: string[],
  flags: Record<string, string | boolean>,
): Promise<void> {
  const { loadConfig } = await import("../config-loader.js");
  const { Pipeline } = await import("../../pipeline/index.js");

  const config = await loadConfig(flags["config"] as string | undefined);
  const pipeline = new Pipeline({
    extractors: config.extractors,
    replacers: [],
    formatters: config.formatters,
  });

  const cwd = process.cwd();
  const allResults: ExtractionResult[] = [];

  // For now, scan all files and let extractors filter by their filePatterns
  const patterns = globs.length > 0 ? globs : config.include;

  // Simple recursive file walker
  function walkDir(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        files.push(...walkDir(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    return files;
  }

  const files = walkDir(cwd);
  for (const filePath of files) {
    const rel = relative(cwd, filePath);
    // Simple pattern matching - check if file matches any include pattern
    const matches = patterns.some((p) => simpleMatch(rel, p));
    if (!matches) continue;

    // Check excludes
    const excluded = (config.exclude ?? []).some((p) => simpleMatch(rel, p));
    if (excluded) continue;

    const source = readFileSync(filePath, "utf-8");
    const results = pipeline.extract(source, rel);
    allResults.push(...results);
  }

  if (flags["format"] === "hook-output") {
    console.log(JSON.stringify(allResults, null, 2));
  } else {
    for (const r of allResults) {
      console.log(`  ${r.key}: "${r.text}" (${r.location.file}:${r.location.line})`);
    }
    console.log(`\nExtracted ${allResults.length} strings`);
  }
}

/** Simple glob-like matching (supports ** and * wildcards). */
function simpleMatch(filePath: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "___GLOBSTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___GLOBSTAR___/g, ".*");
  return new RegExp(`^${regex}$`).test(filePath);
}
