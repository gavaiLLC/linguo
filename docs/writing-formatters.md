# Writing Formatters

Formatters control how translation files are read and written. The core engine calls `serialize()` when writing translation files to disk and `deserialize()` when reading them back.

Linguo ships with a JSON formatter (`@gavai/linguo-json`). You can add support for YAML, XLIFF, PO, or any other format by implementing the `Formatter` interface.

## Formatter Interface

```ts
/** Plugin interface for reading/writing translation files. */
interface Formatter {
  /** File extension this formatter handles (e.g., ".json", ".yaml", ".xliff") */
  extension: string;

  /**
   * Serialize a translations map to file content.
   * @param translations - Flat map of i18n keys to translated strings
   * @returns String content to write to the translation file
   */
  serialize(translations: Record<string, string>): string;

  /**
   * Deserialize file content to a translations map.
   * @param content - Raw file content read from a translation file
   * @returns Flat map of i18n keys to translated strings
   */
  deserialize(content: string): Record<string, string>;
}
```

## The Serialize/Deserialize Contract

The formatter must satisfy a round-trip guarantee:

```ts
const original = { "hero.title": "Hello", "nav.home": "Home" };
const serialized = formatter.serialize(original);
const deserialized = formatter.deserialize(serialized);

// deserialized must deeply equal original
```

**Rules:**

- `serialize()` takes a flat `Record<string, string>` and returns a string. The output should be deterministic (same input always produces the same output).
- `deserialize()` takes a string and returns a flat `Record<string, string>`. It must handle the output of `serialize()` and any hand-edited files in the same format.
- Keys are always flat dot-notation strings (e.g., `"hero.hello_world"`). Do not nest them into objects unless the format requires it, and flatten them back on `deserialize()`.

## Example: YAML Formatter

Here is a complete YAML formatter implementation.

### Package setup

```json
{
  "name": "@gavai/linguo-yaml",
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
    "@gavai/linguo": "workspace:*",
    "yaml": "^2.5.0"
  }
}
```

### Implementation

```ts
// packages/yaml-formatter/src/index.ts
import type { Formatter } from "@gavai/linguo";
import { stringify, parse } from "yaml";

export function yamlFormatter(): Formatter {
  return {
    extension: ".yaml",

    serialize(translations: Record<string, string>): string {
      // Sort keys for deterministic output
      const sorted = Object.keys(translations)
        .sort()
        .reduce<Record<string, string>>((acc, key) => {
          acc[key] = translations[key]!;
          return acc;
        }, {});

      return stringify(sorted);
    },

    deserialize(content: string): Record<string, string> {
      const parsed = parse(content) as Record<string, string>;
      return parsed ?? {};
    },
  };
}
```

### Registration

```ts
// linguo.config.ts
import { defineConfig } from "@gavai/linguo";
import { reactExtractor } from "@gavai/linguo-react";
import { yamlFormatter } from "@gavai/linguo-yaml";

export default defineConfig({
  sourceLanguage: "en",
  targetLanguages: ["es", "fr"],
  include: ["src/**/*.tsx"],
  outDir: "locales",
  extractors: [reactExtractor()],
  formatters: [yamlFormatter()],
});
```

This produces `locales/en.yaml`, `locales/es.yaml`, etc.

## Testing

Test both directions of the contract:

```ts
import { describe, expect, test } from "bun:test";
import { yamlFormatter } from "../src/index.js";

describe("YAML formatter", () => {
  const formatter = yamlFormatter();

  test("round-trips translations", () => {
    const input = { "hero.title": "Hello", "nav.home": "Home" };
    const serialized = formatter.serialize(input);
    const result = formatter.deserialize(serialized);

    expect(result).toEqual(input);
  });

  test("extension is .yaml", () => {
    expect(formatter.extension).toBe(".yaml");
  });

  test("sorts keys alphabetically", () => {
    const input = { "z.last": "Z", "a.first": "A" };
    const serialized = formatter.serialize(input);
    const lines = serialized.trim().split("\n");

    // "a.first" should come before "z.last"
    expect(lines[0]).toContain("a.first");
  });

  test("handles empty input", () => {
    expect(formatter.serialize({})).toBeDefined();
    expect(formatter.deserialize("")).toEqual({});
  });
});
```

## Tips

- Always sort keys in `serialize()` so diffs are minimal and predictable.
- Handle edge cases in `deserialize()`: empty files, missing keys, comments (if the format supports them).
- If your format supports nesting (YAML, JSON), flatten keys on deserialize and keep them flat on serialize. The engine always works with flat `Record<string, string>` maps.
