import { describe, test, expect } from "bun:test";
import { reactExtractor } from "../src/index.js";

const extractor = reactExtractor();

describe("React Extractor — JSX text content", () => {
  test("extracts text from JSX elements", () => {
    const source = `
export function Hero() {
  return <h1>Hello World</h1>;
}`;
    const results = extractor.extract(source, "src/components/Hero.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]!.text).toBe("Hello World");
    expect(results[0]!.key).toBe("hero.hello_world");
  });

  test("extracts text from nested JSX", () => {
    const source = `
export function Card() {
  return (
    <div>
      <h2>Card Title</h2>
      <p>Card description goes here</p>
    </div>
  );
}`;
    const results = extractor.extract(source, "src/components/Card.tsx");
    expect(results).toHaveLength(2);
    expect(results[0]!.text).toBe("Card Title");
    expect(results[1]!.text).toBe("Card description goes here");
  });
});

describe("React Extractor — JSX attributes", () => {
  test("extracts placeholder attribute", () => {
    const source = `
export function Search() {
  return <input placeholder="Search..." />;
}`;
    const results = extractor.extract(source, "src/Search.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]!.text).toBe("Search...");
    expect(results[0]!.context).toBe("placeholder");
  });

  test("extracts aria-label attribute", () => {
    const source = `
export function Nav() {
  return <nav aria-label="Main navigation"><a href="/">Home</a></nav>;
}`;
    const results = extractor.extract(source, "src/Nav.tsx");
    const ariaResult = results.find((r) => r.context === "aria-label");
    expect(ariaResult).toBeDefined();
    expect(ariaResult!.text).toBe("Main navigation");
  });
});

describe("React Extractor — skip rules", () => {
  test("skips strings shorter than 2 chars", () => {
    const source = `
export function App() {
  return <span>A</span>;
}`;
    const results = extractor.extract(source, "src/App.tsx");
    expect(results).toHaveLength(0);
  });

  test("skips data-testid and className attributes", () => {
    const source = `
export function App() {
  return <div data-testid="hero" className="text-lg">Hello</div>;
}`;
    const results = extractor.extract(source, "src/App.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]!.text).toBe("Hello");
  });
});

describe("React Extractor — @linguo marker", () => {
  test("extracts strings with @linguo comment", () => {
    const source = `
const greeting = "Welcome back"; // @linguo
export function App() {
  return <div>{greeting}</div>;
}`;
    const results = extractor.extract(source, "src/App.tsx");
    expect(results.some((r) => r.text === "Welcome back")).toBe(true);
  });
});

describe("React Extractor — @linguo-ignore", () => {
  test("skips strings with @linguo-ignore comment", () => {
    const source = `
export function App() {
  return (
    <div>
      <h1>Hello World</h1>
      {/* @linguo-ignore */}
      <span>Do not extract this</span>
    </div>
  );
}`;
    const results = extractor.extract(source, "src/App.tsx");
    expect(results).toHaveLength(1);
    expect(results[0]!.text).toBe("Hello World");
  });
});
