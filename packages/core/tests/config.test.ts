import { describe, test, expect } from "bun:test";
import { defineConfig, resolveConfig } from "../src/config/index.js";

describe("defineConfig", () => {
  test("returns config as-is for type inference", () => {
    const config = defineConfig({
      sourceLanguage: "en",
      targetLanguages: ["es"],
      include: ["src/**/*.tsx"],
      outDir: "locales",
      extractors: [],
      formatters: [],
    });
    expect(config.sourceLanguage).toBe("en");
    expect(config.targetLanguages).toEqual(["es"]);
  });
});

describe("resolveConfig", () => {
  test("applies defaults for missing optional fields", () => {
    const config = resolveConfig({
      sourceLanguage: "en",
      targetLanguages: ["es"],
      include: ["src/**/*.tsx"],
      outDir: "locales",
      extractors: [],
      formatters: [],
    });
    expect(config.exclude).toEqual(["**/node_modules/**", "**/*.test.*", "**/*.spec.*"]);
  });

  test("preserves user-provided exclude", () => {
    const config = resolveConfig({
      sourceLanguage: "en",
      targetLanguages: ["es"],
      include: ["src/**/*.tsx"],
      exclude: ["custom/**"],
      outDir: "locales",
      extractors: [],
      formatters: [],
    });
    expect(config.exclude).toEqual(["custom/**"]);
  });
});
