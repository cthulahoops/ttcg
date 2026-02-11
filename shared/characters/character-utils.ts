// Utility functions for character identity matching.
// Burdened variants have different names (e.g., "Sam (Burdened)"),
// so we need these helpers to match them to their base identity.

const burdenedToBase: Record<string, string> = {
  "Sam (Burdened)": "Sam",
  "Legolas (Burdened)": "Legolas",
  "Gimli (Burdened)": "Gimli",
  "Aragorn (Burdened)": "Aragorn",
  "Boromir (Burdened)": "Boromir",
  "Merry (Burdened)": "Merry",
  "Pippin (Burdened)": "Pippin",
};

export function baseIdentity(name: string): string {
  return burdenedToBase[name] ?? name;
}

export function isCharacter(name: string, baseName: string): boolean {
  return baseIdentity(name) === baseName;
}

export function isOneOf(name: string, baseNames: string[]): boolean {
  return baseNames.includes(baseIdentity(name));
}
