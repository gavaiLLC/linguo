import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import type { Extractor, ExtractionResult } from "@gavai/linguo";
import { generateKey } from "./key-generator.js";

// Handle CJS/ESM interop for @babel/traverse
const traverse =
  typeof _traverse === "function"
    ? _traverse
    : (_traverse as { default: typeof _traverse }).default;

/** Attribute names that contain user-facing text. */
const EXTRACTABLE_ATTRIBUTES = new Set([
  "placeholder",
  "label",
  "title",
  "alt",
  "aria-label",
  "aria-placeholder",
  "aria-description",
]);

/** Parameter names that suggest user-facing text (exact matches). */
const UI_PARAM_NAMES = new Set([
  "label", "title", "heading", "description", "text", "message",
  "placeholder", "buttonLabel", "confirmLabel", "cancelLabel",
  "emptyText", "errorMessage", "successMessage", "tooltip",
  "caption", "subtitle", "alt", "ariaLabel",
]);

/** Suffixes on parameter names that suggest user-facing text. */
const UI_PARAM_SUFFIXES = [
  "Label", "Text", "Title", "Message", "Heading", "Description", "Placeholder",
];

/** Attribute names that should never be extracted. */
const SKIP_ATTRIBUTES = new Set([
  "className",
  "class",
  "data-testid",
  "id",
  "name",
  "type",
  "href",
  "src",
  "key",
  "ref",
  "style",
  "role",
  "htmlFor",
  "target",
  "rel",
]);

/** Minimum text length to extract. */
const MIN_TEXT_LENGTH = 2;

export function createReactExtractor(): Extractor {
  return {
    filePatterns: ["*.tsx", "*.jsx"],

    extract(source: string, filePath: string): ExtractionResult[] {
      const results: ExtractionResult[] = [];
      const ignoredLines = findIgnoredLines(source);
      const markerResults = findMarkerStrings(source, filePath);
      results.push(...markerResults);

      const ast = parse(source, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });

      traverse(ast, {
        // Extract JSX text content: <h1>Hello World</h1>
        JSXText(path: NodePath<t.JSXText>) {
          const text = path.node.value.trim();
          if (text.length < MIN_TEXT_LENGTH) return;
          if (isIgnored(path.node.loc?.start.line ?? 0, ignoredLines)) return;

          results.push({
            text,
            key: generateKey(filePath, text),
            location: {
              file: filePath,
              line: path.node.loc?.start.line ?? 0,
              column: path.node.loc?.start.column ?? 0,
            },
          });
        },

        // Extract JSX string attributes: <input placeholder="Search" />
        JSXAttribute(path: NodePath<t.JSXAttribute>) {
          const attrName = t.isJSXIdentifier(path.node.name)
            ? path.node.name.name
            : null;
          if (!attrName) return;
          if (SKIP_ATTRIBUTES.has(attrName)) return;
          if (!EXTRACTABLE_ATTRIBUTES.has(attrName)) return;

          const value = path.node.value;
          if (!t.isStringLiteral(value)) return;
          if (value.value.length < MIN_TEXT_LENGTH) return;
          if (isIgnored(path.node.loc?.start.line ?? 0, ignoredLines)) return;

          results.push({
            text: value.value,
            key: generateKey(filePath, value.value),
            context: attrName,
            location: {
              file: filePath,
              line: path.node.loc?.start.line ?? 0,
              column: path.node.loc?.start.column ?? 0,
            },
          });
        },

        // Extract default parameter value strings:
        // function Dialog({ confirmLabel = "Continue" }) {}
        AssignmentPattern(path: NodePath<t.AssignmentPattern>) {
          if (!t.isIdentifier(path.node.left)) return;
          if (!t.isStringLiteral(path.node.right)) return;

          const paramName = path.node.left.name;
          if (!isUIParamName(paramName)) return;

          const text = path.node.right.value;
          if (text.length < MIN_TEXT_LENGTH) return;
          if (isIgnored(path.node.loc?.start.line ?? 0, ignoredLines)) return;

          results.push({
            text,
            key: generateKey(filePath, text),
            context: paramName,
            location: {
              file: filePath,
              line: path.node.loc?.start.line ?? 0,
              column: path.node.loc?.start.column ?? 0,
            },
          });
        },
      });

      return results;
    },
  };
}

/** Find line numbers preceded by @linguo-ignore comments. */
function findIgnoredLines(source: string): Set<number> {
  const ignored = new Set<number>();
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes("@linguo-ignore")) {
      // Ignore the NEXT line after the comment
      ignored.add(i + 2); // +2 because lines are 1-indexed
    }
  }
  return ignored;
}

/** Find strings marked with // @linguo comment on the same line. */
function findMarkerStrings(
  source: string,
  filePath: string,
): ExtractionResult[] {
  const results: ExtractionResult[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.includes("@linguo") || line.includes("@linguo-ignore")) continue;
    const match = /["']([^"']+)["']\s*[;,]?\s*\/\/\s*@linguo/.exec(line);
    if (match) {
      results.push({
        text: match[1]!,
        key: generateKey(filePath, match[1]!),
        location: { file: filePath, line: i + 1, column: match.index },
      });
    }
  }
  return results;
}

function isIgnored(line: number, ignoredLines: Set<number>): boolean {
  return ignoredLines.has(line);
}

/** Check if a parameter name suggests user-facing text. */
function isUIParamName(name: string): boolean {
  if (UI_PARAM_NAMES.has(name)) return true;
  return UI_PARAM_SUFFIXES.some((suffix) => name.endsWith(suffix));
}
