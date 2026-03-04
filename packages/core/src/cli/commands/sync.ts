import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

export async function sync(
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

  const formatter = pipeline.getFormatter();
  if (!formatter) {
    console.error("No formatter configured. Add a formatter to linguo.config.ts.");
    process.exit(1);
  }

  const cwd = process.cwd();
  const outDir = resolve(cwd, config.outDir);

  // Ensure output directory exists
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Read source language file
  const sourceFile = join(outDir, `${config.sourceLanguage}${formatter.extension}`);
  if (!existsSync(sourceFile)) {
    console.error(
      `Source language file not found: ${sourceFile}\nRun 'linguo extract' first to generate it.`,
    );
    process.exit(1);
  }

  const sourceContent = readFileSync(sourceFile, "utf-8");
  const sourceTranslations = formatter.deserialize(sourceContent);
  const sourceKeys = Object.keys(sourceTranslations);

  console.log(`Source language (${config.sourceLanguage}): ${sourceKeys.length} keys\n`);

  let totalAdded = 0;

  for (const lang of config.targetLanguages) {
    const targetFile = join(outDir, `${lang}${formatter.extension}`);
    let targetTranslations: Record<string, string> = {};

    if (existsSync(targetFile)) {
      targetTranslations = formatter.deserialize(readFileSync(targetFile, "utf-8"));
    }

    // Find missing keys and add them
    let added = 0;
    for (const key of sourceKeys) {
      if (!(key in targetTranslations)) {
        targetTranslations[key] = "";
        added++;
      }
    }

    // Remove keys that no longer exist in source
    let removed = 0;
    for (const key of Object.keys(targetTranslations)) {
      if (!(key in sourceTranslations)) {
        delete targetTranslations[key];
        removed++;
      }
    }

    writeFileSync(targetFile, formatter.serialize(targetTranslations));

    if (added > 0 || removed > 0) {
      const parts: string[] = [];
      if (added > 0) parts.push(`+${added} added`);
      if (removed > 0) parts.push(`-${removed} removed`);
      console.log(`  ${lang}: ${parts.join(", ")}`);
    } else {
      console.log(`  ${lang}: up to date`);
    }

    totalAdded += added;
  }

  console.log(`\nSynced ${config.targetLanguages.length} language(s), ${totalAdded} key(s) added`);
}
