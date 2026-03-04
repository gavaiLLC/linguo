import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

export async function status(
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

  // Read source language file
  const sourceFile = join(outDir, `${config.sourceLanguage}${formatter.extension}`);
  if (!existsSync(sourceFile)) {
    console.error(
      `Source language file not found: ${sourceFile}\nRun 'linguo extract' first.`,
    );
    process.exit(1);
  }

  const sourceContent = readFileSync(sourceFile, "utf-8");
  const sourceTranslations = formatter.deserialize(sourceContent);
  const totalKeys = Object.keys(sourceTranslations).length;

  console.log(`Source: ${config.sourceLanguage} (${totalKeys} keys)\n`);
  console.log("Language    Total   Translated   Missing   Coverage");
  console.log("─".repeat(55));

  for (const lang of config.targetLanguages) {
    const targetFile = join(outDir, `${lang}${formatter.extension}`);
    let translated = 0;
    let missing = 0;

    if (existsSync(targetFile)) {
      const targetTranslations = formatter.deserialize(
        readFileSync(targetFile, "utf-8"),
      );

      for (const key of Object.keys(sourceTranslations)) {
        const value = targetTranslations[key];
        if (value && value.trim() !== "") {
          translated++;
        } else {
          missing++;
        }
      }
    } else {
      missing = totalKeys;
    }

    const coverage = totalKeys > 0
      ? Math.round((translated / totalKeys) * 100)
      : 0;

    const langPad = lang.padEnd(12);
    const totalPad = String(totalKeys).padStart(5);
    const translatedPad = String(translated).padStart(10);
    const missingPad = String(missing).padStart(9);
    const coveragePad = `${coverage}%`.padStart(10);

    console.log(`${langPad}${totalPad}${translatedPad}${missingPad}${coveragePad}`);
  }

  console.log();
}
