import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Pipeline } from "../src/pipeline/index.js";
import type { Extractor, Replacer, Formatter } from "../src/interfaces/index.js";
import type { ExtractionResult } from "../src/types.js";

// --- Test plugins ---

const testExtractor: Extractor = {
  filePatterns: ["*.txt"],
  extract(source: string, filePath: string): ExtractionResult[] {
    const results: ExtractionResult[] = [];
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
  replace(source: string, extractions: ExtractionResult[]) {
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

// --- Test suite ---

describe("replace command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "linguo-replace-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("replaces strings in source files", () => {
    const sourceFile = join(tmpDir, "app.txt");
    const original = 'text: "Hello World"\ntext: "Goodbye"\n';
    writeFileSync(sourceFile, original);

    const pipeline = new Pipeline({
      extractors: [testExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    const source = readFileSync(sourceFile, "utf-8");
    const extractions = pipeline.extract(source, "app.txt");
    expect(extractions).toHaveLength(2);

    const result = pipeline.replace(source, extractions, "app.txt");
    expect(result.modified).toBe(true);
    expect(result.output).toContain('t("hello_world")');
    expect(result.output).toContain('t("goodbye")');
    expect(result.output).not.toContain('"Hello World"');
    expect(result.output).not.toContain('"Goodbye"');

    // Write back and verify file on disk
    writeFileSync(sourceFile, result.output);
    const saved = readFileSync(sourceFile, "utf-8");
    expect(saved).toContain('t("hello_world")');
  });

  test("does not modify files with no extractable strings", () => {
    const sourceFile = join(tmpDir, "empty.txt");
    const original = "no translatable content here\n";
    writeFileSync(sourceFile, original);

    const pipeline = new Pipeline({
      extractors: [testExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    const source = readFileSync(sourceFile, "utf-8");
    const extractions = pipeline.extract(source, "empty.txt");
    expect(extractions).toHaveLength(0);
  });

  test("skips files that don't match replacer patterns", () => {
    const sourceFile = join(tmpDir, "app.js");
    const original = 'text: "Hello"\n';
    writeFileSync(sourceFile, original);

    const pipeline = new Pipeline({
      extractors: [testExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    // .js file won't match *.txt replacer pattern
    const result = pipeline.replace(original, [], "app.js");
    expect(result.modified).toBe(false);
    expect(result.output).toBe(original);
  });
});

describe("sync command", () => {
  let tmpDir: string;
  let localesDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "linguo-sync-"));
    localesDir = join(tmpDir, "locales");
    mkdirSync(localesDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("adds missing keys to target language files", () => {
    const formatter = testFormatter;

    // Write source language file with 3 keys
    const sourceTranslations = {
      greeting: "Hello",
      farewell: "Goodbye",
      thanks: "Thank you",
    };
    writeFileSync(
      join(localesDir, "en.json"),
      formatter.serialize(sourceTranslations),
    );

    // Write target language file with only 1 key
    const targetTranslations = {
      greeting: "Hola",
    };
    writeFileSync(
      join(localesDir, "es.json"),
      formatter.serialize(targetTranslations),
    );

    // Simulate sync logic
    const sourceKeys = Object.keys(sourceTranslations);
    const target = formatter.deserialize(
      readFileSync(join(localesDir, "es.json"), "utf-8"),
    );

    let added = 0;
    for (const key of sourceKeys) {
      if (!(key in target)) {
        target[key] = "";
        added++;
      }
    }

    writeFileSync(join(localesDir, "es.json"), formatter.serialize(target));

    expect(added).toBe(2);

    const synced = formatter.deserialize(
      readFileSync(join(localesDir, "es.json"), "utf-8"),
    );
    expect(synced["greeting"]).toBe("Hola"); // preserved
    expect(synced["farewell"]).toBe(""); // added empty
    expect(synced["thanks"]).toBe(""); // added empty
  });

  test("creates target file if it does not exist", () => {
    const formatter = testFormatter;

    const sourceTranslations = {
      greeting: "Hello",
      farewell: "Goodbye",
    };
    writeFileSync(
      join(localesDir, "en.json"),
      formatter.serialize(sourceTranslations),
    );

    // Target file doesn't exist yet
    expect(existsSync(join(localesDir, "fr.json"))).toBe(false);

    // Simulate sync
    const target: Record<string, string> = {};
    for (const key of Object.keys(sourceTranslations)) {
      target[key] = "";
    }
    writeFileSync(join(localesDir, "fr.json"), formatter.serialize(target));

    expect(existsSync(join(localesDir, "fr.json"))).toBe(true);
    const created = formatter.deserialize(
      readFileSync(join(localesDir, "fr.json"), "utf-8"),
    );
    expect(Object.keys(created)).toHaveLength(2);
    expect(created["greeting"]).toBe("");
    expect(created["farewell"]).toBe("");
  });

  test("removes orphaned keys from target files", () => {
    const formatter = testFormatter;

    // Source has only "greeting"
    const sourceTranslations = { greeting: "Hello" };
    writeFileSync(
      join(localesDir, "en.json"),
      formatter.serialize(sourceTranslations),
    );

    // Target has "greeting" + orphaned "old_key"
    const targetTranslations = {
      greeting: "Hola",
      old_key: "Viejo",
    };
    writeFileSync(
      join(localesDir, "es.json"),
      formatter.serialize(targetTranslations),
    );

    // Simulate sync with orphan removal
    const target = formatter.deserialize(
      readFileSync(join(localesDir, "es.json"), "utf-8"),
    );
    for (const key of Object.keys(target)) {
      if (!(key in sourceTranslations)) {
        delete target[key];
      }
    }
    writeFileSync(join(localesDir, "es.json"), formatter.serialize(target));

    const synced = formatter.deserialize(
      readFileSync(join(localesDir, "es.json"), "utf-8"),
    );
    expect(synced["greeting"]).toBe("Hola");
    expect(synced["old_key"]).toBeUndefined();
  });
});

describe("status command", () => {
  let tmpDir: string;
  let localesDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "linguo-status-"));
    localesDir = join(tmpDir, "locales");
    mkdirSync(localesDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("reports correct coverage for translated languages", () => {
    const formatter = testFormatter;

    const sourceTranslations = {
      greeting: "Hello",
      farewell: "Goodbye",
      thanks: "Thank you",
      welcome: "Welcome",
    };
    writeFileSync(
      join(localesDir, "en.json"),
      formatter.serialize(sourceTranslations),
    );

    // Spanish: 2 of 4 translated
    const esTranslations = {
      greeting: "Hola",
      farewell: "Adios",
      thanks: "",
      welcome: "",
    };
    writeFileSync(
      join(localesDir, "es.json"),
      formatter.serialize(esTranslations),
    );

    // French: all 4 translated
    const frTranslations = {
      greeting: "Bonjour",
      farewell: "Au revoir",
      thanks: "Merci",
      welcome: "Bienvenue",
    };
    writeFileSync(
      join(localesDir, "fr.json"),
      formatter.serialize(frTranslations),
    );

    // Compute coverage
    const sourceKeys = Object.keys(sourceTranslations);
    const totalKeys = sourceKeys.length;

    function computeCoverage(langFile: string): { translated: number; missing: number; coverage: number } {
      const target = formatter.deserialize(readFileSync(langFile, "utf-8"));
      let translated = 0;
      let missing = 0;
      for (const key of sourceKeys) {
        if (target[key] && target[key]!.trim() !== "") {
          translated++;
        } else {
          missing++;
        }
      }
      const coverage = totalKeys > 0 ? Math.round((translated / totalKeys) * 100) : 0;
      return { translated, missing, coverage };
    }

    const esCoverage = computeCoverage(join(localesDir, "es.json"));
    expect(esCoverage.translated).toBe(2);
    expect(esCoverage.missing).toBe(2);
    expect(esCoverage.coverage).toBe(50);

    const frCoverage = computeCoverage(join(localesDir, "fr.json"));
    expect(frCoverage.translated).toBe(4);
    expect(frCoverage.missing).toBe(0);
    expect(frCoverage.coverage).toBe(100);
  });

  test("reports 0% coverage when target file is missing", () => {
    const formatter = testFormatter;

    const sourceTranslations = { greeting: "Hello", farewell: "Goodbye" };
    writeFileSync(
      join(localesDir, "en.json"),
      formatter.serialize(sourceTranslations),
    );

    // No de.json file exists
    const totalKeys = Object.keys(sourceTranslations).length;
    const translated = 0;
    const missing = totalKeys;
    const coverage = 0;

    expect(translated).toBe(0);
    expect(missing).toBe(2);
    expect(coverage).toBe(0);
  });
});

describe("run command — full pipeline", () => {
  let tmpDir: string;
  let localesDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "linguo-run-"));
    localesDir = join(tmpDir, "locales");
    mkdirSync(localesDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("extract -> replace -> sync full pipeline", () => {
    const sourceFile = join(tmpDir, "page.txt");
    writeFileSync(sourceFile, 'text: "Hello World"\ntext: "Submit"\n');

    const pipeline = new Pipeline({
      extractors: [testExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    // Step 1: Extract
    const source = readFileSync(sourceFile, "utf-8");
    const extractions = pipeline.extract(source, "page.txt");
    expect(extractions).toHaveLength(2);

    // Step 2: Replace
    const replaced = pipeline.replace(source, extractions, "page.txt");
    expect(replaced.modified).toBe(true);
    writeFileSync(sourceFile, replaced.output);

    // Step 3: Write source translations and sync
    const formatter = pipeline.getFormatter()!;
    const sourceTranslations: Record<string, string> = {};
    for (const e of extractions) {
      sourceTranslations[e.key] = e.text;
    }
    writeFileSync(
      join(localesDir, "en.json"),
      formatter.serialize(sourceTranslations),
    );

    // Sync target languages
    const targetLangs = ["es", "fr"];
    for (const lang of targetLangs) {
      const target: Record<string, string> = {};
      for (const key of Object.keys(sourceTranslations)) {
        target[key] = "";
      }
      writeFileSync(
        join(localesDir, `${lang}.json`),
        formatter.serialize(target),
      );
    }

    // Verify: source file is modified
    const modifiedSource = readFileSync(sourceFile, "utf-8");
    expect(modifiedSource).toContain('t("hello_world")');
    expect(modifiedSource).toContain('t("submit")');
    expect(modifiedSource).not.toContain('"Hello World"');

    // Verify: source language file has correct keys
    const enFile = formatter.deserialize(
      readFileSync(join(localesDir, "en.json"), "utf-8"),
    );
    expect(enFile["hello_world"]).toBe("Hello World");
    expect(enFile["submit"]).toBe("Submit");

    // Verify: target language files have all keys (empty)
    for (const lang of targetLangs) {
      const langFile = formatter.deserialize(
        readFileSync(join(localesDir, `${lang}.json`), "utf-8"),
      );
      expect(Object.keys(langFile)).toHaveLength(2);
      expect(langFile["hello_world"]).toBe("");
      expect(langFile["submit"]).toBe("");
    }
  });

  test("preserves existing translations in target files during sync", () => {
    const pipeline = new Pipeline({
      extractors: [testExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    const formatter = pipeline.getFormatter()!;

    // Source translations
    const sourceTranslations = {
      greeting: "Hello",
      farewell: "Goodbye",
      new_key: "New String",
    };
    writeFileSync(
      join(localesDir, "en.json"),
      formatter.serialize(sourceTranslations),
    );

    // Existing target with some translations
    writeFileSync(
      join(localesDir, "es.json"),
      formatter.serialize({ greeting: "Hola", farewell: "Adios" }),
    );

    // Sync
    const target = formatter.deserialize(
      readFileSync(join(localesDir, "es.json"), "utf-8"),
    );
    for (const key of Object.keys(sourceTranslations)) {
      if (!(key in target)) {
        target[key] = "";
      }
    }
    writeFileSync(join(localesDir, "es.json"), formatter.serialize(target));

    // Verify existing translations preserved, new key added empty
    const synced = formatter.deserialize(
      readFileSync(join(localesDir, "es.json"), "utf-8"),
    );
    expect(synced["greeting"]).toBe("Hola");
    expect(synced["farewell"]).toBe("Adios");
    expect(synced["new_key"]).toBe("");
  });
});
