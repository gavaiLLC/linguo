/** Plugin interface for reading/writing translation files. */
export interface Formatter {
  /** File extension this formatter handles (e.g., ".json", ".xliff") */
  extension: string;
  /** Serialize a translations map to file content. */
  serialize(translations: Record<string, string>): string;
  /** Deserialize file content to a translations map. */
  deserialize(content: string): Record<string, string>;
}
