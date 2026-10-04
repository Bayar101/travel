import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSheetHistory } from "./sheet-history";

// Fake browser: entries (url + state) + index; go() fires popstate asynchronously.
function setup() {
  const entries: { url: string; state: { depth?: number } | null }[] = [{ url: "#/", state: null }];
  let idx = 0;
  let pop: () => void = () => {};
  const env = {
    pushState: (st: { depth: number }) => { entries.splice(idx + 1); entries.push({ url: entries[idx].url + "|sheet", state: st }); idx++; },
    go: (d: number) => { const to = idx + d; setTimeout(() => { idx = to; pop(); }, 5); },
    currentHash: () => entries[idx].url,
    setHash: (h: string) => { entries.splice(idx + 1); entries.push({ url: h, state: null }); idx++; },
    replaceHash: (h: string) => { entries[idx] = { url: h, state: null }; },
    getDepth: () => entries[idx].state?.depth ?? 0,
    setDepth: (d: number) => { entries[idx].state = { depth: d }; },
    onPop: (fn: () => void) => { pop = fn; },
  };
  const sh = createSheetHistory(env);
  return {
    sh, idx: () => idx, pop: () => { idx--; pop(); },
    urls: () => entries.map((e) => e.url),
    cur: () => entries[idx].url,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("sheet history", () => {
  it("push on open, back on release", async () => {
    const t = setup();
    const h = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    expect(t.idx()).toBe(1);
    h.release();
    await vi.advanceTimersByTimeAsync(10);
    expect(t.idx()).toBe(0);
  });

  it("strict-mode open/release/open pushes once", async () => {
    const t = setup();
    t.sh.open(() => {}).release();
    t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(10);
    expect(t.urls()).toEqual(["#/", "#/|sheet"]);
  });

  it("user back closes topmost only", async () => {
    const t = setup();
    const a = vi.fn(), b = vi.fn();
    t.sh.open(a);
    await vi.advanceTimersByTimeAsync(1);
    t.sh.open(b);
    await vi.advanceTimersByTimeAsync(1);
    t.pop();
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
  });

  it("stacked sheets released together unwind with one go", async () => {
    const t = setup();
    const a = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    const b = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    b.release(); a.release();
    await vi.advanceTimersByTimeAsync(10);
    expect(t.idx()).toBe(0);
  });

  it("navigate while sheet open: no stray entry", async () => {
    const t = setup();
    const h = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    t.sh.navigate("#/x");
    h.release(); // unmount after navigate
    await vi.advanceTimersByTimeAsync(20);
    expect(t.urls()).toEqual(["#/", "#/x"]);
    expect(t.cur()).toBe("#/x");
  });

  it("navigate right after release (back pending) is not undone", async () => {
    const t = setup();
    const h = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    h.release();
    await Promise.resolve(); // microtask: go(-1) issued
    t.sh.navigate("#/x");
    await vi.advanceTimersByTimeAsync(20);
    expect(t.urls()).toEqual(["#/", "#/x"]);
    expect(t.cur()).toBe("#/x");
  });

  it("navigate before push happened: sheet never pushes", async () => {
    const t = setup();
    t.sh.open(() => {});
    t.sh.navigate("#/x");
    await vi.advanceTimersByTimeAsync(20);
    expect(t.urls()).toEqual(["#/", "#/x"]);
  });

  it("navigate with no sheets sets hash directly", () => {
    const t = setup();
    t.sh.navigate("#/y");
    expect(t.cur()).toBe("#/y");
  });

  it("navigate during in-flight back with lower sheet still open", async () => {
    const t = setup();
    const a = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    const b = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    b.release();
    await Promise.resolve(); // go(-1) in flight
    t.sh.navigate("#/x"); // lower sheet `a` still mounted
    await vi.advanceTimersByTimeAsync(30);
    a.release();
    await vi.advanceTimersByTimeAsync(30);
    expect(t.urls()).toEqual(["#/", "#/x"]);
    expect(t.cur()).toBe("#/x");
  });

  it("releases in separate ticks before first popstate", async () => {
    const t = setup();
    const a = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    const b = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    b.release();
    await Promise.resolve();
    a.release();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(30);
    expect(t.idx()).toBe(0);
    // later real back must not be swallowed
    const c = vi.fn();
    t.sh.open(c);
    await vi.advanceTimersByTimeAsync(1);
    t.pop();
    expect(c).toHaveBeenCalledOnce();
  });

  it("user back skips close for released entry", async () => {
    const t = setup();
    const ca = vi.fn();
    const a = t.sh.open(ca);
    await vi.advanceTimersByTimeAsync(1);
    t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    a.release(); // lower released, top open
    await Promise.resolve();
    t.pop(); // user back closes top
    await vi.advanceTimersByTimeAsync(30);
    expect(ca).not.toHaveBeenCalled();
    expect(t.idx()).toBe(0);
  });

  it("canGoBack tracks in-app depth, ignoring sheets", async () => {
    const t = setup();
    expect(t.sh.canGoBack()).toBe(false); // deep link landing
    const h = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    expect(t.sh.canGoBack()).toBe(false); // sheet entry doesn't count
    h.release();
    await vi.advanceTimersByTimeAsync(20);
    t.sh.navigate("#/a");
    expect(t.sh.canGoBack()).toBe(true);
    t.sh.navigate("#/a"); // same hash: no new entry, depth unchanged
    expect(t.urls()).toEqual(["#/", "#/a"]);
    t.sh.navigate("#/b");
  });

  it("navigate with replace swaps the current entry and keeps depth", () => {
    const t = setup();
    t.sh.navigate("#/days");
    t.sh.navigate("#/day/a");
    t.sh.navigate("#/day/b", { replace: true });
    expect(t.urls()).toEqual(["#/", "#/days", "#/day/b"]);
    expect(t.sh.canGoBack()).toBe(true);
  });

  it("replace on a deep-link landing keeps canGoBack false", () => {
    const t = setup();
    t.sh.navigate("#/day/b", { replace: true });
    expect(t.urls()).toEqual(["#/day/b"]);
    expect(t.sh.canGoBack()).toBe(false);
  });

  it("replace while a sheet is open unwinds the sheet first", async () => {
    const t = setup();
    t.sh.navigate("#/day/a");
    const h = t.sh.open(() => {});
    await vi.advanceTimersByTimeAsync(1);
    t.sh.navigate("#/day/b", { replace: true });
    h.release();
    await vi.advanceTimersByTimeAsync(20);
    expect(t.cur()).toBe("#/day/b");
    expect(t.urls().slice(0, 2)).toEqual(["#/", "#/day/b"]); // forward sheet entry is dead
    expect(t.sh.canGoBack()).toBe(true);
  });
});
