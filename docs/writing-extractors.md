# Writing Extractors

Extractors are plugins that parse source files and return user-facing strings. Each extractor targets specific file types via glob patterns.

To add framework support (Vue, Svelte, Angular, etc.), you implement two interfaces: `Extractor` and `Replacer`.

## Extractor Interface

```ts
import type { ExtractionResult } from "@gavai/linguo";

/** Plugin interface for extracting user-facing strings from source files. */
interface Extractor {
  /** Glob patterns for files this extractor handles (e.g., ["*.vue", "*.tsx"]) */
  filePatterns: string[];

  /**
   * Parse source code and return all extractable user-facing strings.
   * @param source - The full file contents as a string
   * @param filePath - Relative path to the file being processed
   * @returns Array of extracted strings with location and key metadata
   */
  extract(source: string, filePath: string): ExtractionResult[];
}
```

### ExtractionResult

Each extracted string is returned as an `ExtractionResult`:

```ts
interface ExtractionResult {
  /** The original string literal */
  text: string;
  /** Where it was found in source */
  location: SourceLocation;
  /** Context hint for translators (e.g., "button label", "placeholder") */
  context?: string;
  /** Generated i18n key (e.g., "hero.hello_world") */
  key: string;
}

interface SourceLocation {
  file: string;
  line: number;
  column: number;
}
```

## Replacer Interface

The replacer rewrites source files, swapping raw strings for i18n function calls:

```ts
import type { ExtractionResult, ReplaceResult } from "@gavai/linguo";

/** Plugin interface for replacing extracted strings with i18n calls. */
interface Replacer {
  /** Glob patterns for files this replacer handles */
  filePatterns: string[];

  /**
   * Replace original strings with i18n function calls in source code.
   * @param source - The original file contents
   * @param extractions - Strings previously extracted from this file
   * @returns The modified source and whether any changes were made
   */
  replace(source: string, extractions: ExtractionResult[]): ReplaceResult;

  /** Import statements to auto-add when replacements are made. */
  imports?: string[];
}

interface ReplaceResult {
  /** Modified source code */
  output: string;
  /** Whether the file was changed */
  modified: boolean;
}
```

## Example: Vue SFC Extractor

Here is a complete example of an extractor for Vue Single File Components. It extracts text from `<template>` blocks.

### Package setup

Create `packages/vue/` with a `package.json`:

```json
{
  "name": "@gavai/linguo-vue",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "dependencies": {
    "@gavai/linguo": "workspace:*"
  }
}
```

### Extractor implementation

```ts
// packages/vue/src/extractor.ts
import type { Extractor, ExtractionResult } from "@gavai/linguo";
import { generateKey } from "./key-generator.js";

export function createVueExtractor(): Extractor {
  return {
    filePatterns: ["*.vue"],

    extract(source: string, filePath: string): ExtractionResult[] {
      const results: ExtractionResult[] = [];

      // Extract the <template> block
      const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);
      if (!templateMatch) return results;

      const template = templateMatch[1]!;
      const templateStart = source.indexOf(templateMatch[0]);

      // Find text content between tags: >Some text<
      const textRegex = />([^<>{]+)</g;
      let match: RegExpExecArray | null;

      while ((match = textRegex.exec(template)) !== null) {
        const text = match[1]!.trim();
        if (text.length < 2) continue;
        // Skip interpolations like {{ variable }}
        if (text.includes("{{")) continue;

        const offsetInFile = templateStart + match.index;
        const line = source.slice(0, offsetInFile).split("\n").length;

        results.push({
          text,
          key: generateKey(filePath, text),
          location: {
            file: filePath,
            line,
            column: 0,
          },
        });
      }

      return results;
    },
  };
}
```

### Replacer implementation

```ts
// packages/vue/src/replacer.ts
import type { Replacer, ExtractionResult, ReplaceResult } from "@gavai/linguo";

export function createVueReplacer(): Replacer {
  return {
    filePatterns: ["*.vue"],
    imports: [],  // Vue uses $t globally, no import needed

    replace(source: string, extractions: ExtractionResult[]): ReplaceResult {
      let output = source;
      let modified = false;

      // Sort by position descending so replacements don't shift indices
      const sorted = [...extractions].sort(
        (a, b) => b.location.line - a.location.line,
      );

      for (const extraction of sorted) {
        const replaced = output.replace(
          `>${extraction.text}<`,
          `>{{ $t("${extraction.key}") }}<`,
        );
        if (replaced !== output) {
          output = replaced;
          modified = true;
        }
      }

      return { output, modified };
    },
  };
}
```

### Public API

```ts
// packages/vue/src/index.ts
export { createVueExtractor as vueExtractor } from "./extractor.js";
export { createVueReplacer as vueReplacer } from "./replacer.js";
```

## How Extraction Zones Work

The pipeline routes files to extractors based on `filePatterns`:

1. The CLI walks the project directory matching `include` globs from config.
2. For each file, the pipeline checks every registered extractor's `filePatterns`.
3. If a file matches (e.g., `Hero.tsx` matches `*.tsx`), that extractor's `extract()` is called.
4. Results from all matching extractors are merged.

Multiple extractors can match the same file. For example, you could have a general TypeScript extractor and a React-specific one that both process `.tsx` files.

## Key Generation

Keys should be deterministic and human-readable. The built-in React extractor uses this strategy:

- **Prefix**: filename without extension, converted to snake_case (e.g., `Hero.tsx` becomes `hero`)
- **Slug**: the extracted text, lowercased, non-alphanumeric characters replaced with underscores, truncated to 4 words

Result: `hero.hello_world`, `nav.search_for_products`

Your extractor can use any key strategy. The key is stored in `ExtractionResult.key` and used as the lookup in translation files.

## Registration

Users register your extractor in their `linguo.config.ts`:

```ts
import { defineConfig } from "@gavai/linguo";
import { vueExtractor, vueReplacer } from "@gavai/linguo-vue";
import { jsonFormatter } from "@gavai/linguo-json";

export default defineConfig({
  sourceLanguage: "en",
  targetLanguages: ["es", "fr"],
  include: ["src/**/*.vue"],
  outDir: "locales",
  extractors: [vueExtractor()],
  formatters: [jsonFormatter()],
});
```

## Testing

Write tests using Bun test. Feed your extractor source code strings and assert on the returned `ExtractionResult[]`:

```ts
import { describe, expect, test } from "bun:test";
import { createVueExtractor } from "../src/extractor.js";

describe("Vue extractor", () => {
  const extractor = createVueExtractor();

  test("extracts text from template", () => {
    const source = `<template><h1>Hello World</h1></template>`;
    const results = extractor.extract(source, "App.vue");

    expect(results).toHaveLength(1);
    expect(results[0]!.text).toBe("Hello World");
    expect(results[0]!.key).toMatch(/^app\.hello_world$/);
  });

  test("skips interpolations", () => {
    const source = `<template><p>{{ count }} items</p></template>`;
    const results = extractor.extract(source, "List.vue");

    expect(results).toHaveLength(0);
  });
});
```
