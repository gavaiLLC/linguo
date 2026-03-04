import { basename } from "node:path";

/**
 * Generate an i18n key from a file path and extracted text.
 *
 * Strategy:
 * - Take the filename without extension as prefix (e.g., Hero.tsx -> hero)
 * - Slugify the text (lowercase, spaces to underscores, strip non-alphanumeric)
 * - Truncate slug to first 4 words
 */
export function generateKey(filePath: string, text: string): string {
  const name = basename(filePath).replace(/\.[^.]+$/, "");
  const prefix = toSnakeCase(name);
  const slug = toSnakeCase(text.slice(0, 60));
  return `${prefix}.${slug}`;
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .split("_")
    .slice(0, 4)
    .join("_");
}
