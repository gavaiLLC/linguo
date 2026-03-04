import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Pipeline } from "../src/pipeline/index.js";
import { ManifestTracker } from "../src/manifest/index.js";
import type { Extractor, Replacer, Formatter } from "../src/interfaces/index.js";

const testExtractor: Extractor = {
  filePatterns: ["*.txt"],
  extract(source, filePath) {
    const results: { text: string; key: string; location: { file: string; line: number; column: number } }[] = [];
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const match = /text:\s*"([^"]+)"/.exec(lines[i]!);
      if (match) {
        const slug = match[1]!.toLowerCase().replace(/\s+/g, "_");
        results.push({
          text: match[1]!,
          key: slug,
          location: { file: filePath, line: i + 1, column: match.index },
        });
      }
    }
    return results;
  },
};

const testReplacer: Replacer = {
  filePatterns: ["*.txt"],
  replace(source, extractions) {
    let output = source;
    for (const e of extractions) {
      output = output.replace(`"${e.text}"`, `t("${e.key}")`);
    }
    return { output, modified: output !== source };
  },
};

const testFormatter: Formatter = {
  extension: ".json",
  serialize: (t) => JSON.stringify(t, null, 2) + "\n",
  deserialize: (c) => JSON.parse(c) as Record<string, string>,
};

describe("CLI integration — extract + replace + sync", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "linguo-test-"));
    mkdirSync(join(tmpDir, "locales"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("full pipeline: extract -> replace -> write translations", () => {
    const sourceFile = join(tmpDir, "test.txt");
    writeFileSync(sourceFile, 'text: "Hello World"\ntext: "Goodbye"\n');

    const pipeline = new Pipeline({
      extractors: [testExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    // Extract
    const source = readFileSync(sourceFile, "utf-8");
    const extractions = pipeline.extract(source, "test.txt");
    expect(extractions).toHaveLength(2);

    // Replace
    const replaced = pipeline.replace(source, extractions, "test.txt");
    expect(replaced.modified).toBe(true);
    writeFileSync(sourceFile, replaced.output);

    // Write source language file
    const formatter = pipeline.getFormatter()!;
    const translations: Record<string, string> = {};
    for (const e of extractions) {
      translations[e.key] = e.text;
    }
    const translationFile = join(tmpDir, "locales", "en.json");
    writeFileSync(translationFile, formatter.serialize(translations));

    // Update manifest
    const tracker = new ManifestTracker();
    for (const e of extractions) {
      tracker.record(e.key, e.location);
    }
    writeFileSync(join(tmpDir, "locales", "_manifest.json"), tracker.serialize());

    // Verify
    const savedTranslations = JSON.parse(readFileSync(translationFile, "utf-8"));
    expect(savedTranslations["hello_world"]).toBe("Hello World");
    expect(savedTranslations["goodbye"]).toBe("Goodbye");

    const savedSource = readFileSync(sourceFile, "utf-8");
    expect(savedSource).toContain('t("hello_world")');
    expect(savedSource).toContain('t("goodbye")');
  });
});
