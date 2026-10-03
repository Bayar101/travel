import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSheetHistory } from "./sheet-history";

// Fake browser: entries array + index; go() fires popstate asynchronously.
function setup() {
  const entries: string[] = ["#/"];
  let idx = 0;
  let pop: () => void = () => {};
  const env = {
    pushState: () => { entries.splice(idx + 1); entries.push("sheet"); idx++; },
    go: (d: number) => { const to = idx + d; setTimeout(() => { idx = to; pop(); }, 5); },
    setHash: (h: string) => { entries.splice(idx + 1); entries.push(h); idx++; },
    onPop: (fn: () => void) => { pop = fn; },
  };
  const sh = createSheetHistory(env);
  return { sh, entries, cur: () => entries[idx], idx: () => idx, pop: () => pop() };
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
    expect(t.entries).toEqual(["#/", "sheet"]);
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
    expect(t.entries).toEqual(["#/", "#/x"]);
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
    expect(t.entries).toEqual(["#/", "#/x"]);
    expect(t.cur()).toBe("#/x");
  });

  it("navigate before push happened: sheet never pushes", async () => {
    const t = setup();
    t.sh.open(() => {});
    t.sh.navigate("#/x");
    await vi.advanceTimersByTimeAsync(20);
    expect(t.entries).toEqual(["#/", "#/x"]);
  });

  it("navigate with no sheets sets hash directly", () => {
    const t = setup();
    t.sh.navigate("#/y");
    expect(t.cur()).toBe("#/y");
  });
});
