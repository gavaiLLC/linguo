import { describe, test, expect } from "bun:test";
import { claudeHookAdapter } from "../src/index.js";

describe("Claude Hook Adapter", () => {
  const adapter = claudeHookAdapter();

  test("has correct name", () => {
    expect(adapter.name).toBe("claude-code");
  });

  test("generates hook config", async () => {
    const configs = await adapter.install();
    expect(configs.length).toBeGreaterThan(0);
    const hookConfig = configs.find((c) => c.path.includes("hooks"));
    expect(hookConfig).toBeDefined();
  });

  test("formats extraction request as structured prompt", () => {
    const request = adapter.formatRequest([
      {
        text: "Hello World",
        key: "hero.hello_world",
        location: { file: "src/Hero.tsx", line: 5, column: 8 },
      },
      {
        text: "Get Started",
        key: "hero.get_started",
        location: { file: "src/Hero.tsx", line: 6, column: 12 },
        context: "button label",
      },
    ]);
    expect(request).toContain("Hello World");
    expect(request).toContain("Get Started");
    expect(request).toContain("hero.hello_world");
    expect(request).toContain("JSON");
  });

  test("parses translation response", () => {
    const response = JSON.stringify({
      translations: [
        {
          language: "es",
          translations: {
            "hero.hello_world": "Hola Mundo",
            "hero.get_started": "Comenzar",
          },
        },
        {
          language: "fr",
          translations: {
            "hero.hello_world": "Bonjour le monde",
            "hero.get_started": "Commencer",
          },
        },
      ],
    });
    const results = adapter.parseResponse(response);
    expect(results).toHaveLength(2);
    expect(results[0]!.language).toBe("es");
    expect(results[0]!.translations["hero.hello_world"]).toBe("Hola Mundo");
    expect(results[1]!.language).toBe("fr");
  });
});
