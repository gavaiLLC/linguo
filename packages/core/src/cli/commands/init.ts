import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const CONFIG_TEMPLATE = `import { defineConfig } from "@gavai/linguo";

export default defineConfig({
  sourceLanguage: "en",
  targetLanguages: ["es", "fr", "de"],
  include: ["src/**/*.tsx", "src/**/*.ts"],
  exclude: ["**/*.test.*", "**/node_modules/**"],
  outDir: "locales",
  extractors: [],
  formatters: [],
});
`;

export async function init(
  flags: Record<string, string | boolean>,
): Promise<void> {
  const cwd = process.cwd();
  const configPath = resolve(cwd, "linguo.config.ts");

  if (existsSync(configPath)) {
    console.log("linguo.config.ts already exists, skipping.");
    return;
  }

  writeFileSync(configPath, CONFIG_TEMPLATE);
  console.log("Created linguo.config.ts");

  const localesDir = resolve(cwd, "locales");
  if (!existsSync(localesDir)) {
    mkdirSync(localesDir, { recursive: true });
    console.log("Created locales/ directory");
  }

  console.log("\nNext steps:");
  console.log("  1. Install extractor packages (e.g., bun add -d @gavai/linguo-react)");
  console.log("  2. Add extractors and formatters to linguo.config.ts");
  console.log("  3. Run: linguo extract");
}
