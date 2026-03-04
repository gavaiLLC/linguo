# Contributing to Linguo

Thanks for your interest in contributing. This guide covers setup, project structure, and how to add new plugins.

## Prerequisites

- [Bun](https://bun.sh/) v1.3+
- Node.js 22+
- Git

## Setup

```bash
git clone https://github.com/gavaiLLC/linguo.git
cd linguo
bun install
bun run check   # lint + typecheck + test
```

## Project Structure

```
packages/
  core/              # @gavai/linguo -- engine, interfaces, CLI, pipeline
    src/
      cli/           # CLI entry point and commands
      config/        # Config loader and defaults
      interfaces/    # Extractor, Replacer, Formatter, TranslationProvider, HookAdapter
      manifest/      # ManifestTracker for key origin tracking
      pipeline/      # Pipeline orchestrator
      types.ts       # Shared type definitions
      index.ts       # Public API exports
    tests/
  react/             # @gavai/linguo-react -- React/JSX extractor + replacer
  json-formatter/    # @gavai/linguo-json -- JSON translation file formatter
  hook-claude/       # @gavai/linguo-hook-claude -- Claude Code hook adapter
```

## Development Commands

| Command | Description |
| --- | --- |
| `bun install` | Install all dependencies |
| `bun run build` | Build all packages with Turbo |
| `bun run test` | Run all tests |
| `bun run lint` | Lint all packages (oxlint) |
| `bun run typecheck` | Type-check all packages |
| `bun run check` | Lint + typecheck + test |

## Adding a New Extractor

1. Create a new package under `packages/` (e.g., `packages/vue`).
2. Implement the `Extractor` interface from `@gavai/linguo`:

```ts
import type { Extractor, ExtractionResult } from "@gavai/linguo";

export function vueExtractor(): Extractor {
  return {
    filePatterns: ["*.vue"],
    extract(source: string, filePath: string): ExtractionResult[] {
      // Parse source, return extracted strings
    },
  };
}
```

3. Implement the `Replacer` interface if your extractor needs source rewriting:

```ts
import type { Replacer, ExtractionResult, ReplaceResult } from "@gavai/linguo";

export function vueReplacer(): Replacer {
  return {
    filePatterns: ["*.vue"],
    imports: ['import { t } from "@/i18n"'],
    replace(source: string, extractions: ExtractionResult[]): ReplaceResult {
      // Rewrite source, return { output, modified }
    },
  };
}
```

4. Add tests. Write the failing test first, then implement.
5. Register in the user's `linguo.config.ts`.

See [docs/writing-extractors.md](docs/writing-extractors.md) for the full guide.

## Adding a New Formatter

Implement the `Formatter` interface:

```ts
import type { Formatter } from "@gavai/linguo";

export function yamlFormatter(): Formatter {
  return {
    extension: ".yaml",
    serialize(translations: Record<string, string>): string { /* ... */ },
    deserialize(content: string): Record<string, string> { /* ... */ },
  };
}
```

See [docs/writing-formatters.md](docs/writing-formatters.md) for the full guide.

## Adding a New Hook Adapter

Implement the `HookAdapter` interface:

```ts
import type { HookAdapter } from "@gavai/linguo";

export function cursorHookAdapter(): HookAdapter {
  return {
    name: "cursor",
    async install() { /* ... */ },
    formatRequest(extracted) { /* ... */ },
    parseResponse(raw) { /* ... */ },
  };
}
```

See [docs/writing-hook-adapters.md](docs/writing-hook-adapters.md) for the full guide.

## Code Style

- **Strict TypeScript** -- No `any`. Use `unknown` with narrowing.
- **`interface` over `type`** for object shapes.
- **TDD** -- Write a failing test first, then implement to make it pass.
- **Bun test** for all tests. Bun runtime for scripts.
- **oxlint** for linting.
- Each package builds with **tsup** to `dist/` (CJS + ESM dual output).

## Pull Request Process

1. Fork the repo and create a branch from `main`.
2. Write tests for any new functionality.
3. Run `bun run check` -- all lint, typecheck, and tests must pass.
4. Use [Conventional Commits](https://www.conventionalcommits.org/) for your commit messages:
   - `feat(core): add XLIFF formatter support`
   - `fix(react): handle template literals in JSX`
   - `test(json-formatter): add round-trip serialization test`
   - `docs: update getting started guide`
5. Open a PR against `main`. Describe what changed and why.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
