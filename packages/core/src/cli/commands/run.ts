import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative, join } from "node:path";

export async function run(
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

  // === Step 1: Extract ===
  console.log("Step 1/3: Extracting strings...");
  const files = walkDir(cwd);
  const fileExtractions: Map<string, { filePath: string; rel: string; source: string; extractions: import("../../types.js").ExtractionResult[] }> = new Map();
  let totalExtracted = 0;

  for (const filePath of files) {
    const rel = relative(cwd, filePath);
    if (!patterns.some((p) => simpleMatch(rel, p))) continue;
    if ((config.exclude ?? []).some((p) => simpleMatch(rel, p))) continue;

    const source = readFileSync(filePath, "utf-8");
    const extractions = pipeline.extract(source, rel);
    if (extractions.length > 0) {
      fileExtractions.set(rel, { filePath, rel, source, extractions });
      totalExtracted += extractions.length;
    }
  }
  console.log(`  Extracted ${totalExtracted} strings from ${fileExtractions.size} file(s)\n`);

  // === Step 2: Replace ===
  console.log("Step 2/3: Replacing strings with i18n calls...");
  let totalModified = 0;
  for (const [, { filePath, rel, source, extractions }] of fileExtractions) {
    const result = pipeline.replace(source, extractions, rel);
    if (result.modified) {
      writeFileSync(filePath, result.output);
      totalModified++;
    }
  }
  console.log(`  Modified ${totalModified} file(s)\n`);

  // === Step 3: Sync ===
  console.log("Step 3/3: Syncing language files...");
  const formatter = pipeline.getFormatter();
  if (!formatter) {
    console.log("  No formatter configured, skipping sync.\n");
    printSummary(totalExtracted, totalModified, 0);
    return;
  }

  const outDir = resolve(cwd, config.outDir);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Build source translations from all extractions
  const sourceTranslations: Record<string, string> = {};
  for (const [, { extractions }] of fileExtractions) {
    for (const e of extractions) {
      sourceTranslations[e.key] = e.text;
    }
  }

  // Write source language file
  const sourceFile = join(outDir, `${config.sourceLanguage}${formatter.extension}`);

  // Merge with existing source file to preserve any manually-added keys
  if (existsSync(sourceFile)) {
    const existing = formatter.deserialize(readFileSync(sourceFile, "utf-8"));
    for (const [key, value] of Object.entries(existing)) {
      if (!(key in sourceTranslations)) {
        sourceTranslations[key] = value;
      }
    }
  }

  writeFileSync(sourceFile, formatter.serialize(sourceTranslations));
  const sourceKeys = Object.keys(sourceTranslations);

  // Sync target language files
  let totalSynced = 0;
  for (const lang of config.targetLanguages) {
    const targetFile = join(outDir, `${lang}${formatter.extension}`);
    let targetTranslations: Record<string, string> = {};

    if (existsSync(targetFile)) {
      targetTranslations = formatter.deserialize(readFileSync(targetFile, "utf-8"));
    }

    let added = 0;
    for (const key of sourceKeys) {
      if (!(key in targetTranslations)) {
        targetTranslations[key] = "";
        added++;
      }
    }

    // Remove orphaned keys
    for (const key of Object.keys(targetTranslations)) {
      if (!(key in sourceTranslations)) {
        delete targetTranslations[key];
      }
    }

    writeFileSync(targetFile, formatter.serialize(targetTranslations));
    totalSynced += added;
  }
  console.log(`  Synced ${config.targetLanguages.length} language(s), ${totalSynced} key(s) added\n`);

  printSummary(totalExtracted, totalModified, totalSynced);
}

function printSummary(extracted: number, modified: number, synced: number): void {
  console.log("Summary:");
  console.log(`  Strings extracted:  ${extracted}`);
  console.log(`  Files modified:     ${modified}`);
  console.log(`  Keys synced:        ${synced}`);
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
