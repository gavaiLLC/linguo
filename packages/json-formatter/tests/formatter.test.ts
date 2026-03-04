import { describe, test, expect } from "bun:test";
import { jsonFormatter } from "../src/index.js";

describe("jsonFormatter", () => {
  test("serializes translations to sorted JSON", () => {
    const result = jsonFormatter().serialize({
      "hero.greeting": "Hello",
      "app.title": "My App",
    });
    const parsed = JSON.parse(result);
    const keys = Object.keys(parsed);
    expect(keys).toEqual(["app.title", "hero.greeting"]);
  });

  test("deserializes JSON string to translations map", () => {
    const json = '{"hero.greeting": "Hello", "app.title": "My App"}';
    const result = jsonFormatter().deserialize(json);
    expect(result["hero.greeting"]).toBe("Hello");
    expect(result["app.title"]).toBe("My App");
  });

  test("has .json extension", () => {
    expect(jsonFormatter().extension).toBe(".json");
  });
});
