import type {
  HookAdapter,
  ExtractionResult,
  TranslationResult,
  HookConfig,
} from "@gavai/linguo";

/**
 * Claude Code hook adapter.
 *
 * Generates a .claude/hooks.json entry that triggers linguo extract
 * on file save. The extraction output is formatted as a structured
 * prompt that Claude can respond to with translations.
 */
export function createClaudeHookAdapter(): HookAdapter {
  return {
    name: "claude-code",

    async install(): Promise<HookConfig[]> {
      const hooksConfig = {
        hooks: {
          PostToolUse: [
            {
              matcher: "Write|Edit",
              command: "linguo extract --format hook-output $LINGUO_FILE",
            },
          ],
        },
      };

      return [
        {
          path: ".claude/hooks/linguo.json",
          content: JSON.stringify(hooksConfig, null, 2),
        },
      ];
    },

    formatRequest(extracted: ExtractionResult[]): string {
      const entries = extracted.map((e) => ({
        key: e.key,
        text: e.text,
        context: e.context ?? null,
      }));

      return [
        "Linguo has extracted the following strings that need translation.",
        "Please translate each string and respond with a JSON object in this exact format:",
        "",
        '{"translations": [{"language": "<code>", "translations": {"<key>": "<translated>"}}]}',
        "",
        "Strings to translate:",
        JSON.stringify(entries, null, 2),
      ].join("\n");
    },

    parseResponse(raw: string): TranslationResult[] {
      const jsonMatch = raw.match(/\{[\s\S]*"translations"[\s\S]*\}/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as {
        translations: TranslationResult[];
      };
      return parsed.translations;
    },
  };
}
