import { describe, expect, it } from "vitest";
import { hashPassword, isValidStoredHash, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hash format salt:hash hex", () => {
    const h = hashPassword("pw");
    const [salt, hash] = h.split(":");
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });
  it("verifies right password", () => {
    expect(verifyPassword("pw", hashPassword("pw"))).toBe(true);
  });
  it("rejects wrong password", () => {
    expect(verifyPassword("bad", hashPassword("pw"))).toBe(false);
  });
  it("rejects malformed stored", () => {
    expect(verifyPassword("pw", "")).toBe(false);
    expect(verifyPassword("pw", "abc")).toBe(false);
    expect(verifyPassword("pw", "zz:yy")).toBe(false);
  });
  it("salts differ", () => {
    expect(hashPassword("pw")).not.toBe(hashPassword("pw"));
  });
});

describe("isValidStoredHash", () => {
  it("accepts generated hash", () => {
    expect(isValidStoredHash(hashPassword("pw"))).toBe(true);
  });
  it("rejects missing or malformed", () => {
    expect(isValidStoredHash(undefined)).toBe(false);
    expect(isValidStoredHash("")).toBe(false);
    expect(isValidStoredHash("abc")).toBe(false);
    expect(isValidStoredHash("zz:yy")).toBe(false);
    expect(isValidStoredHash("ab:cd")).toBe(false); // wrong key length
    expect(isValidStoredHash(`${hashPassword("pw")}:x`)).toBe(false);
  });
});
