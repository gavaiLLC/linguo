import type { Replacer, ExtractionResult, ReplaceResult } from "@gavai/linguo";

export function createReactReplacer(): Replacer {
  return {
    filePatterns: ["*.tsx", "*.jsx"],
    imports: ['import { t } from "@/i18n"'],

    replace(source: string, extractions: ExtractionResult[]): ReplaceResult {
      let output = source;
      let modified = false;

      // Sort by position descending so replacements don't shift indices
      const sorted = [...extractions].sort(
        (a, b) =>
          b.location.line - a.location.line ||
          b.location.column - a.location.column,
      );

      for (const extraction of sorted) {
        // Replace JSX text: Hello World -> {t("key")}
        const jsxReplaced = output.replace(
          extraction.text,
          `{t("${extraction.key}")}`,
        );
        if (jsxReplaced !== output) {
          output = jsxReplaced;
          modified = true;
          continue;
        }

        // Replace attribute: placeholder="Search" -> placeholder={t("key")}
        const attrReplaced = output.replace(
          `"${extraction.text}"`,
          `{t("${extraction.key}")}`,
        );
        if (attrReplaced !== output) {
          output = attrReplaced;
          modified = true;
        }
      }

      return { output, modified };
    },
  };
}
