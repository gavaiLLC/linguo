import type { Formatter } from "@gavai/linguo";

/** Creates a JSON formatter for translation files. Sorts keys alphabetically. */
export function jsonFormatter(): Formatter {
  return {
    extension: ".json",

    serialize(translations: Record<string, string>): string {
      const sorted = Object.keys(translations)
        .sort()
        .reduce<Record<string, string>>((acc, key) => {
          acc[key] = translations[key]!;
          return acc;
        }, {});
      return JSON.stringify(sorted, null, 2) + "\n";
    },

    deserialize(content: string): Record<string, string> {
      return JSON.parse(content) as Record<string, string>;
    },
  };
}
