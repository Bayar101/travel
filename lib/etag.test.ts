import { describe, expect, it } from "vitest";
import { etagFor, matchesEtag } from "./etag";

describe("etag", () => {
  it("formats", () => expect(etagFor(7)).toBe('"v7"'));
  it("matches exact", () => expect(matchesEtag('"v7"', 7)).toBe(true));
  it("matches weak prefix", () => expect(matchesEtag('W/"v7"', 7)).toBe(true));
  it("matches in comma list", () => expect(matchesEtag('"v1", W/"v7" ,"v9"', 7)).toBe(true));
  it("matches *", () => expect(matchesEtag("*", 7)).toBe(true));
  it("rejects other version", () => expect(matchesEtag('"v6"', 7)).toBe(false));
  it("rejects null/empty", () => {
    expect(matchesEtag(null, 7)).toBe(false);
    expect(matchesEtag("", 7)).toBe(false);
  });
});
