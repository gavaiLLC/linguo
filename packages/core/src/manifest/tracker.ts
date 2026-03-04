import type { SourceLocation } from "../types.js";

export interface ManifestEntry {
  source: SourceLocation;
  /** ISO timestamp of when the key was first extracted */
  firstSeen: string;
  /** ISO timestamp of last extraction */
  lastSeen: string;
}

export class ManifestTracker {
  private entries: Map<string, ManifestEntry>;

  constructor() {
    this.entries = new Map();
  }

  /** Record an extraction for a key. Updates lastSeen if already tracked. */
  record(key: string, location: SourceLocation): void {
    const now = new Date().toISOString();
    const existing = this.entries.get(key);
    if (existing) {
      existing.source = location;
      existing.lastSeen = now;
    } else {
      this.entries.set(key, {
        source: location,
        firstSeen: now,
        lastSeen: now,
      });
    }
  }

  /** Get the manifest entry for a key. */
  get(key: string): ManifestEntry | undefined {
    return this.entries.get(key);
  }

  /** Find keys in the manifest that are not in the current extraction set. */
  findOrphans(currentKeys: Set<string>): string[] {
    const orphans: string[] = [];
    for (const key of this.entries.keys()) {
      if (!currentKeys.has(key)) {
        orphans.push(key);
      }
    }
    return orphans.sort();
  }

  /** Serialize the manifest to a JSON string. */
  serialize(): string {
    const obj: Record<string, ManifestEntry> = {};
    for (const [key, entry] of this.entries) {
      obj[key] = entry;
    }
    return JSON.stringify(obj, null, 2);
  }

  /** Deserialize a JSON string into a ManifestTracker. */
  static deserialize(json: string): ManifestTracker {
    const tracker = new ManifestTracker();
    const obj = JSON.parse(json) as Record<string, ManifestEntry>;
    for (const [key, entry] of Object.entries(obj)) {
      tracker.entries.set(key, entry);
    }
    return tracker;
  }
}
