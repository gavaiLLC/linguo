import { describe, test, expect } from "bun:test";
import { Pipeline } from "../src/pipeline/index.js";
import type { Extractor } from "../src/interfaces/extractor.js";
import type { Replacer } from "../src/interfaces/replacer.js";
import type { Formatter } from "../src/interfaces/formatter.js";
import type { ExtractionResult } from "../src/types.js";

/** Minimal test extractor that finds strings wrapped in double quotes in lines containing "text:" */
const testExtractor: Extractor = {
  filePatterns: ["*.txt"],
  extract(source: string, filePath: string): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const match = /text:\s*"([^"]+)"/.exec(line);
      if (match) {
        results.push({
          text: match[1]!,
          key: match[1]!.toLowerCase().replace(/\s+/g, "_"),
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
  serialize: (translations) => JSON.stringify(translations, null, 2),
  deserialize: (content) => JSON.parse(content) as Record<string, string>,
};

describe("Pipeline", () => {
  test("extract stage finds strings from source", () => {
    const pipeline = new Pipeline({
      extractors: [testExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    const results = pipeline.extract('text: "Hello World"\ntext: "Goodbye"', "test.txt");
    expect(results).toHaveLength(2);
    expect(results[0]!.text).toBe("Hello World");
    expect(results[0]!.key).toBe("hello_world");
    expect(results[1]!.text).toBe("Goodbye");
  });

  test("replace stage substitutes strings with i18n calls", () => {
    const pipeline = new Pipeline({
      extractors: [testExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    const source = 'text: "Hello World"';
    const extractions = pipeline.extract(source, "test.txt");
    const result = pipeline.replace(source, extractions, "test.txt");
    expect(result.output).toBe('text: t("hello_world")');
    expect(result.modified).toBe(true);
  });

  test("selects correct extractor by file pattern", () => {
    const jsExtractor: Extractor = {
      filePatterns: ["*.js"],
      extract: () => [{ text: "JS", key: "js", location: { file: "", line: 1, column: 0 } }],
    };
    const pipeline = new Pipeline({
      extractors: [testExtractor, jsExtractor],
      replacers: [testReplacer],
      formatters: [testFormatter],
    });

    const txtResults = pipeline.extract('text: "Hello"', "test.txt");
    expect(txtResults[0]!.text).toBe("Hello");

    const jsResults = pipeline.extract("anything", "app.js");
    expect(jsResults[0]!.text).toBe("JS");
  });
});
