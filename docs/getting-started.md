# Getting Started

This guide walks through installing Linguo, configuring it for a React project, and running the extraction pipeline.

## 1. Install

Install the core package, the React extractor, and the JSON formatter:

```bash
bun add -d @gavai/linguo @gavai/linguo-react @gavai/linguo-json
```

## 2. Initialize

Scaffold a config file and `locales/` directory:

```bash
bunx linguo init
```

This creates `linguo.config.ts` in your project root with sensible defaults.

## 3. Configure

Open `linguo.config.ts` and add the React extractor and JSON formatter:

```ts
import { defineConfig } from "@gavai/linguo";
import { reactExtractor, reactReplacer } from "@gavai/linguo-react";
import { jsonFormatter } from "@gavai/linguo-json";

export default defineConfig({
  sourceLanguage: "en",
  targetLanguages: ["es", "fr", "de"],
  include: ["src/**/*.tsx", "src/**/*.ts"],
  exclude: ["**/*.test.*", "**/node_modules/**"],
  outDir: "locales",
  extractors: [reactExtractor()],
  formatters: [jsonFormatter()],
});
```

### Optional: add the Claude Code hook adapter

If you use Claude Code and want translations generated automatically via hooks:

```bash
bun add -d @gavai/linguo-hook-claude
```

```ts
import { claudeHookAdapter } from "@gavai/linguo-hook-claude";

export default defineConfig({
  // ... other config
  hookAdapters: [claudeHookAdapter()],
});
```

Then install the hook:

```bash
bunx linguo init   # generates .claude/hooks/linguo.json
```

## 4. Extract (Dry Run)

See what strings Linguo would extract, without modifying any files:

```bash
bunx linguo extract
```

Output looks like:

```
  hero.hello_world: "Hello World" (src/Hero.tsx:5)
  hero.get_started: "Get Started" (src/Hero.tsx:12)
  nav.search: "Search" (src/Nav.tsx:8)

Extracted 3 strings
```

You can also pass specific globs:

```bash
bunx linguo extract "src/components/**/*.tsx"
```

## 5. Run Full Pipeline

Run the complete pipeline -- extract, replace source files, and sync translation files:

```bash
bunx linguo run
```

This will:

1. Extract all user-facing strings from your source files.
2. Replace raw strings with `t("key")` calls and add import statements.
3. Write translation files to `locales/` (one per target language).

## 6. Check Results

After running, your `locales/` directory will contain files like:

```
locales/
  en.json
  es.json
  fr.json
  de.json
```

Each file maps extracted keys to their translations (or empty strings for untranslated keys):

```json
{
  "hero.get_started": "Get Started",
  "hero.hello_world": "Hello World",
  "nav.search": "Search"
}
```

## Annotations

### Force extraction with `@linguo`

Mark any string literal for extraction, even outside JSX:

```ts
const errorMsg = "Something went wrong"; // @linguo
```

### Skip extraction with `@linguo-ignore`

Prevent the next line from being extracted:

```tsx
{/* @linguo-ignore */}
<p>DEBUG: internal testing string</p>
```

## Next Steps

- [Writing Extractors](writing-extractors.md) -- Add support for Vue, Svelte, or other frameworks
- [Writing Formatters](writing-formatters.md) -- Output YAML, XLIFF, or custom formats
- [Writing Hook Adapters](writing-hook-adapters.md) -- Integrate with Cursor, Windsurf, or other AI tools
