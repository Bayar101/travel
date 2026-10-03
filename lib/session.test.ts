import { SignJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, sessionCookieOptions, verifySessionToken, SESSION_COOKIE } from "@/lib/session";

const SECRET = "x".repeat(40);

describe("session", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
  });

  it("creates a token that verifies", async () => {
    expect(await verifySessionToken(await createSessionToken())).toBe(true);
  });

  it("rejects tampered token", async () => {
    const t = await createSessionToken();
    expect(await verifySessionToken(t.slice(0, -2) + (t.endsWith("aa") ? "bb" : "aa"))).toBe(false);
  });

  it("rejects garbage and undefined", async () => {
    expect(await verifySessionToken("nope")).toBe(false);
    expect(await verifySessionToken(undefined)).toBe(false);
  });

  it("rejects expired token", async () => {
    const t = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(1000)
      .setExpirationTime(2000)
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySessionToken(t)).toBe(false);
  });

  it("rejects token signed with other secret", async () => {
    const t = await createSessionToken();
    vi.stubEnv("SESSION_SECRET", "y".repeat(40));
    expect(await verifySessionToken(t)).toBe(false);
  });

  it("expires in 14 days", async () => {
    const t = await createSessionToken();
    const payload = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString());
    expect(payload.exp - payload.iat).toBe(14 * 24 * 3600);
  });

  it("cookie options", () => {
    expect(SESSION_COOKIE).toBe("trip_session");
    expect(sessionCookieOptions).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 1209600 });
  });

  it("throws when secret too short", async () => {
    vi.stubEnv("SESSION_SECRET", "short");
    await expect(createSessionToken()).rejects.toThrow();
  });
});
