import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(req: NextRequest) {
  if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    // Public: Next assets (dir prefix) and exact public files/pages. Each name is
    // end-anchored so look-alikes (/api/login-x, /loginfoo, /sw.jsX) stay gated.
    // Must stay a literal (Next reads it statically); covered by lib/proxy-matcher.test.ts.
    "/((?!(?:_next/static|_next/image)(?:/|$)|(?:favicon\\.ico|icon\\.svg|apple-icon(?:\\.png)?|manifest\\.webmanifest|sw\\.js|login|api/login)$).*)",
  ],
};
