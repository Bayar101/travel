export function etagFor(version: number): string {
  return `"v${version}"`;
}

// Handles `W/` weak prefix, comma lists and `*`.
export function matchesEtag(ifNoneMatch: string | null, version: number): boolean {
  if (!ifNoneMatch) return false;
  const current = etagFor(version);
  return ifNoneMatch.split(",").some((part) => {
    const tag = part.trim().replace(/^W\//, "");
    return tag === "*" || tag === current;
  });
}
