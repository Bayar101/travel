import { describe, expect, it } from "vitest";
// Next's own matcher compiler (internal, untyped export), so the test checks what Next actually runs.
import * as staticInfo from "next/dist/build/analysis/get-page-static-info";
import { config } from "@/proxy";

type Compile = (m: string[], cfg: object) => { regexp: string }[];
const { getMiddlewareMatchers } = staticInfo as unknown as { getMiddlewareMatchers: Compile };
const [matcher] = getMiddlewareMatchers(config.matcher, {});
const gated = (path: string) => new RegExp(matcher.regexp).test(path);

describe("proxy matcher", () => {
  it("gates app pages and api", () => {
    for (const p of ["/", "/api/data", "/api/items/reorder", "/api/login-x", "/api/loginx/y", "/loginfoo", "/login/x", "/sw.jsX", "/sw-map-cache.jsX", "/sw.js/x", "/icon.svgz", "/apple-iconx"]) {
      expect(gated(p), p).toBe(true);
    }
  });
  it("leaves login, static assets and icons public", () => {
    for (const p of ["/login", "/api/login", "/sw.js", "/sw-map-cache.js", "/_next/static/chunks/x.js", "/_next/image", "/favicon.ico", "/icon.svg", "/apple-icon", "/apple-icon.png", "/manifest.webmanifest"]) {
      expect(gated(p), p).toBe(false);
    }
  });
});
