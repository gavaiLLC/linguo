import { describe, test, expect } from "bun:test";
import { reactExtractor, reactReplacer } from "../src/index.js";

const extractor = reactExtractor();
const replacer = reactReplacer();

describe("React Replacer", () => {
  test("replaces JSX text with t() call", () => {
    const source = `
export function Hero() {
  return <h1>Hello World</h1>;
}`;
    const extractions = extractor.extract(source, "src/Hero.tsx");
    const result = replacer.replace(source, extractions);
    expect(result.output).toContain('{t("hero.hello_world")}');
    expect(result.modified).toBe(true);
  });

  test("replaces attribute value with t() expression", () => {
    const source = `
export function Search() {
  return <input placeholder="Search here" />;
}`;
    const extractions = extractor.extract(source, "src/Search.tsx");
    const result = replacer.replace(source, extractions);
    expect(result.output).toContain('{t("search.search_here")}');
    expect(result.modified).toBe(true);
  });

  test("does not modify source when no extractions", () => {
    const source = `export function App() { return <div />; }`;
    const result = replacer.replace(source, []);
    expect(result.output).toBe(source);
    expect(result.modified).toBe(false);
  });

  test("has correct import", () => {
    expect(replacer.imports).toContain('import { t } from "@/i18n"');
  });
});
