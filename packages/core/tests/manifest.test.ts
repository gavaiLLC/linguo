import { describe, test, expect, beforeEach } from "bun:test";
import { ManifestTracker } from "../src/manifest/index.js";

describe("ManifestTracker", () => {
  let tracker: ManifestTracker;

  beforeEach(() => {
    tracker = new ManifestTracker();
  });

  test("records an extraction", () => {
    tracker.record("hero.greeting", {
      file: "src/Hero.tsx",
      line: 5,
      column: 8,
    });
    const entry = tracker.get("hero.greeting");
    expect(entry).toBeDefined();
    expect(entry!.source.file).toBe("src/Hero.tsx");
  });

  test("detects orphaned keys", () => {
    tracker.record("hero.greeting", { file: "src/Hero.tsx", line: 5, column: 8 });
    tracker.record("hero.subtitle", { file: "src/Hero.tsx", line: 6, column: 8 });

    const currentKeys = new Set(["hero.greeting"]);
    const orphans = tracker.findOrphans(currentKeys);
    expect(orphans).toEqual(["hero.subtitle"]);
  });

  test("serializes and deserializes", () => {
    tracker.record("hero.greeting", { file: "src/Hero.tsx", line: 5, column: 8 });
    const json = tracker.serialize();
    const restored = ManifestTracker.deserialize(json);
    expect(restored.get("hero.greeting")!.source.file).toBe("src/Hero.tsx");
  });
});
