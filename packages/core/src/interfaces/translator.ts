/** Plugin interface for generating translations in standalone/CI mode. */
export interface TranslationProvider {
  name: string;
  /** Translate a batch of strings from one language to another. */
  translate(
    strings: { key: string; text: string; context?: string }[],
    from: string,
    to: string,
  ): Promise<Record<string, string>>;
}
