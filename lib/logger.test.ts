import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger, redactError } from "@/lib/logger";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function capture() {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  return { log, err };
}

describe("logger", () => {
  it("writes one JSON line with required fields", () => {
    const { log } = capture();
    vi.stubEnv("NODE_ENV", "development");
    createLogger("api.data").info("data_loaded", { request_id: "r1", row_count: 3 });
    expect(log).toHaveBeenCalledTimes(1);
    const rec = JSON.parse(log.mock.calls[0][0] as string);
    expect(rec).toMatchObject({
      level: "INFO",
      message: "data_loaded",
      service: "trip-planner",
      env: "development",
      request_id: "r1",
      logger: "api.data",
      row_count: 3,
    });
    expect(new Date(rec["@timestamp"]).toISOString()).toBe(rec["@timestamp"]);
  });

  it("defaults request_id to null", () => {
    const { log } = capture();
    createLogger("x").warn("w");
    expect(JSON.parse(log.mock.calls[0][0] as string).request_id).toBeNull();
    expect(JSON.parse(log.mock.calls[0][0] as string).level).toBe("WARN");
  });

  it("error goes to console.error with serialized error", () => {
    const { log, err } = capture();
    createLogger("x").error("boom", { request_id: "r2" }, new TypeError("bad"));
    expect(log).not.toHaveBeenCalled();
    const rec = JSON.parse(err.mock.calls[0][0] as string);
    expect(rec.level).toBe("ERROR");
    expect(rec.error_name).toBe("TypeError");
    expect(rec.error_message).toBe("bad");
    expect(rec.error_stack).toContain("TypeError");
  });

  it("serializes non-Error throwables", () => {
    const { err } = capture();
    createLogger("x").error("boom", undefined, "oops");
    expect(JSON.parse(err.mock.calls[0][0] as string).error_message).toBe("oops");
  });

  it("suppresses debug in production only", () => {
    const { log } = capture();
    vi.stubEnv("NODE_ENV", "production");
    createLogger("x").debug("d");
    expect(log).not.toHaveBeenCalled();
    vi.stubEnv("NODE_ENV", "development");
    createLogger("x").debug("d");
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0] as string).level).toBe("DEBUG");
  });

  it("reserved fields cannot be overridden by extra fields", () => {
    const { log } = capture();
    createLogger("x").info("m", { message: "evil", level: "ERROR", service: "z" });
    const rec = JSON.parse(log.mock.calls[0][0] as string);
    expect(rec.message).toBe("m");
    expect(rec.level).toBe("INFO");
    expect(rec.service).toBe("trip-planner");
  });

  it("redactError keeps name + stack frames, replaces the message everywhere", () => {
    const url = "https://maps.app.goo.gl/SECRET?g_st=ic";
    const orig = new TypeError(`fetch ${url} failed`);
    const safe = redactError(orig, "network");
    expect(safe).toBeInstanceOf(Error);
    expect(safe.name).toBe("TypeError");
    expect(safe.message).toBe("network");
    expect(safe.stack).toMatch(/^TypeError: network\n\s+at /);
    expect(safe.stack).not.toContain("SECRET");
    const { log } = capture();
    createLogger("x").warn("w", undefined, safe);
    expect(log.mock.calls[0][0]).not.toContain("SECRET");
  });
  it("redactError handles non-Errors and multi-line messages", () => {
    expect(redactError("x https://a/b", "r").name).toBe("NonError");
    const e = new Error("line1 https://a/SECRET\nline2 SECRET");
    expect(redactError(e, "r").stack).not.toContain("SECRET");
  });
});
