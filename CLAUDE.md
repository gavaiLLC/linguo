# Linguo

Automated i18n engine with plugin-based architecture.

## Commands

- `bun install` — install dependencies
- `bun run build` — build all packages
- `bun run test` — run all tests
- `bun run lint` — lint all packages
- `bun run typecheck` — type-check all packages
- `bun run check` — lint + typecheck + test

## Architecture

- `packages/core` — @gavai/linguo: engine, interfaces, CLI, pipeline
- `packages/react` — @gavai/linguo-react: React/JSX extractor + replacer
- `packages/json-formatter` — @gavai/linguo-json: JSON translation file format
- `packages/hook-claude` — @gavai/linguo-hook-claude: Claude Code hook adapter

## Conventions

- Bun runtime, Bun test, oxlint
- Strict TypeScript (no `any`, use `unknown` with narrowing)
- `interface` preferred over `type` for object shapes
- TDD: write failing test first, then implement
- Each package builds with tsup to dist/ (CJS + ESM)
- Exports point to dist/ for npm consumers
