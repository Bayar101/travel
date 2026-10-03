import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

const log = createLogger("api.login");

export async function POST(req: Request) {
  const request_id = req.headers.get("x-vercel-id") ?? crypto.randomUUID();
  try {
    let password: unknown;
    try {
      ({ password } = await req.json());
    } catch {
      password = undefined;
    }
    if (typeof password !== "string" || password.length === 0 || password.length > 200) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    const stored = process.env.APP_PASSWORD_HASH ?? "";
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
