import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { relative, join } from "node:path";

export async function replace(
  globs: string[],
  flags: Record<string, string | boolean>,
): Promise<void> {
  const { loadConfig } = await import("../config-loader.js");
  const { Pipeline } = await import("../../pipeline/index.js");

  const config = await loadConfig(flags["config"] as string | undefined);
  const pipeline = new Pipeline({
    extractors: config.extractors,
    replacers: config.replacers ?? [],
    formatters: config.formatters,
  });

  const cwd = process.cwd();
  const patterns = globs.length > 0 ? globs : config.include;

  const files = walkDir(cwd);
  let totalModified = 0;

  for (const filePath of files) {
    const rel = relative(cwd, filePath);
    if (!patterns.some((p) => simpleMatch(rel, p))) continue;
    if ((config.exclude ?? []).some((p) => simpleMatch(rel, p))) continue;

    const source = readFileSync(filePath, "utf-8");
    const extractions = pipeline.extract(source, rel);
    if (extractions.length === 0) continue;

    const result = pipeline.replace(source, extractions, rel);
    if (result.modified) {
      writeFileSync(filePath, result.output);
      totalModified++;
      console.log(`  replaced ${extractions.length} strings in ${rel}`);
    }
  }

  console.log(`\nReplaced strings in ${totalModified} file(s)`);
}

/** Simple recursive file walker, skipping node_modules and .git. */
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

/** Simple glob-like matching (supports ** and * wildcards). */
function simpleMatch(filePath: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "___GLOBSTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___GLOBSTAR___/g, ".*");
  return new RegExp(`^${regex}$`).test(filePath);
}
