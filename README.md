# Linguo

**Automated i18n Engine**

Write code naturally. Linguo extracts, replaces, and translates your strings automatically.

[![CI](https://github.com/gavaiLLC/linguo/actions/workflows/ci.yml/badge.svg)](https://github.com/gavaiLLC/linguo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Plugin-based** -- Bring your own extractors, formatters, and translation providers
- **Framework-agnostic** -- React plugin included, Vue/Svelte/Angular easy to add
- **AI-powered hook integration** -- Claude Code hook adapter ships out of the box
- **CLI + API** -- Use from the command line or import the pipeline programmatically

## Quick Start

```bash
# Install core + React plugin + JSON formatter
bun add -d @gavai/linguo @gavai/linguo-react @gavai/linguo-json

# Scaffold config
bunx linguo init

# Edit linguo.config.ts (see below)

# Extract strings (dry run)
bunx linguo extract

# Run full pipeline: extract, replace, sync
bunx linguo run
```

## Configuration

```ts
// linguo.config.ts
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

## CLI Commands

| Command | Description |
| --- | --- |
| `linguo init` | Scaffold `linguo.config.ts` and `locales/` directory |
| `linguo extract [globs...]` | Extract strings from source files |
| `linguo replace [globs...]` | Replace strings with i18n calls in source |
| `linguo sync` | Ensure all language files have all keys |
| `linguo status` | Show translation coverage stats |
| `linguo run [globs...]` | Full pipeline: extract, replace, sync |

**Options:**

- `--config <path>` -- Path to config file (default: `linguo.config.ts`)
- `--help` -- Show help message

## Plugin System

Linguo is built on five plugin interfaces. Implement any of them to extend the engine.

| Interface | Purpose |
| --- | --- |
| `Extractor` | Parse source files and return extractable strings |
| `Replacer` | Replace original strings with i18n calls |
| `Formatter` | Read/write translation files (JSON, YAML, XLIFF, etc.) |
| `TranslationProvider` | Generate translations in CI/standalone mode |
| `HookAdapter` | Integrate with AI coding tools (Claude Code, Cursor, etc.) |

See the [plugin authoring guides](docs/) for full interface definitions and examples.

## Packages

| Package | Description |
| --- | --- |
| [`@gavai/linguo`](packages/core) | Core engine, interfaces, CLI, pipeline |
| [`@gavai/linguo-react`](packages/react) | React/JSX extractor and replacer |
| [`@gavai/linguo-json`](packages/json-formatter) | JSON translation file formatter |
| [`@gavai/linguo-hook-claude`](packages/hook-claude) | Claude Code hook adapter |

## How It Works

```
Extract --> Store --> Replace --> Translate --> Sync
```

1. **Extract** -- Extractors scan source files and pull out user-facing strings with location metadata.
2. **Store** -- The manifest tracker records each key, its source location, and when it was first/last seen.
3. **Replace** -- Replacers rewrite source files, swapping raw strings for `t("key")` calls.
4. **Translate** -- Translation providers (or AI hook adapters) generate translations for target languages.
5. **Sync** -- Formatters write translation files to `locales/`, ensuring every language has every key.

## Annotations

### `@linguo` marker

Mark any string for extraction, even outside JSX:

```ts
const title = "Welcome back"; // @linguo
```

### `@linguo-ignore`

Skip extraction for the next line:

```tsx
{/* @linguo-ignore */}
<p>This string will not be extracted</p>
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and contribution guidelines.

## License

[MIT](LICENSE) -- Copyright (c) 2026 gavai LLC
