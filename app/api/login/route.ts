import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { getRequestId } from "@/lib/api-handler";
import { isValidStoredHash, verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

const log = createLogger("api.login");

export async function POST(req: Request) {
  const request_id = getRequestId(req);
  try {
    const stored = process.env.APP_PASSWORD_HASH;
    if (!isValidStoredHash(stored)) {
      log.error("login_misconfigured", { request_id, reason: "app_password_hash_missing_or_malformed" });
      return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
    }
    let password: unknown;
    try {
      ({ password } = await req.json());
    } catch {
      password = undefined;
    }
    if (typeof password !== "string" || password.length === 0 || password.length > 200) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    if (!verifyPassword(password, stored)) {
      log.warn("login_failed", { request_id });
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    const res = new NextResponse(null, { status: 204 });
    res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
    log.info("login_succeeded", { request_id });
    return res;
  } catch (err) {
    log.error("login_error", { request_id }, err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
