// Shared bookkeeping between open sheets (Android back closes the topmost
// sheet) and router navigation. Each open sheet owns one history entry.
//
// Contract: callers may close sheets and navigate in ANY order (navigate then
// unmount, unmount then navigate, several sheets unmounting together). Sheet
// entries are always unwound with a single history.go(-n) and any navigation
// requested meanwhile is applied only after that traversal settles, so no
// stray same-URL entry is left and a pending back can't undo the new hash.

export interface HistoryEnv {
  pushState(state: unknown): void;
  go(delta: number): void;
  setHash(hash: string): void;
  onPop(handler: () => void): void; // register once
}

export interface SheetHandle {
  isTop(): boolean;
  release(): void; // sheet closed/unmounted
}

interface Entry {
  close: () => void;
  inHistory: boolean; // pushed, not yet unwound
  released: boolean;
  dead: boolean; // abandoned by navigate or user back
  timer?: ReturnType<typeof setTimeout>;
}

export function createSheetHistory(env: HistoryEnv) {
  const open: Entry[] = []; // mounted sheets, topmost last (Escape)
  let hist: Entry[] = []; // entries living in browser history, topmost last
  let backsInFlight = 0;
  let pendingNav: string | null = null;
  let reconcileQueued = false;
  let listening = false;

  function onPop() {
    if (backsInFlight > 0) {
      backsInFlight--;
      if (backsInFlight === 0 && pendingNav !== null) {
        const p = pendingNav;
        pendingNav = null;
        env.setHash(p);
      }
      return;
    }
    // User/OS back: topmost sheet's entry was popped; close it.
    const e = hist.pop();
    if (e) {
      e.inHistory = false;
      e.dead = true;
      e.close();
    }
  }

  function unwind(n: number) {
    if (n <= 0) return;
    backsInFlight++;
    env.go(-n);
  }

  function reconcile() {
    reconcileQueued = false;
    let n = 0;
    while (hist.length && hist[hist.length - 1].released) {
      hist.pop()!.inHistory = false;
      n++;
    }
    unwind(n);
  }

  function openSheet(close: () => void): SheetHandle {
    if (!listening) {
      env.onPop(onPop);
      listening = true;
    }
    const entry: Entry = { close, inHistory: false, released: false, dead: false };
    open.push(entry);
    // Deferred so StrictMode's mount/unmount/mount never pushes then backs out.
    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      if (entry.released || entry.dead) return;
      env.pushState({ sheet: true });
      entry.inHistory = true;
      hist.push(entry);
    }, 0);
    return {
      isTop: () => open[open.length - 1] === entry,
      release() {
        if (entry.released) return;
        entry.released = true;
        clearTimeout(entry.timer);
        const i = open.indexOf(entry);
        if (i >= 0) open.splice(i, 1);
        if (entry.inHistory && !reconcileQueued) {
          reconcileQueued = true;
          queueMicrotask(reconcile); // batch sheets unmounting together
        }
      },
    };
  }

  function navigate(hash: string) {
    for (const e of open) {
      clearTimeout(e.timer);
      e.timer = undefined;
      e.dead = true;
    }
    const n = hist.length;
    for (const e of hist) {
      e.inHistory = false;
      e.dead = true;
    }
    hist = [];
    if (n === 0 && backsInFlight === 0) {
      env.setHash(hash);
      return;
    }
    pendingNav = hash;
    unwind(n);
  }

  return { open: openSheet, navigate };
}

export const sheetHistory = createSheetHistory({
  pushState: (state) => history.pushState(state, ""),
  go: (d) => history.go(d),
  setHash: (h) => {
    window.location.hash = h;
  },
  onPop: (fn) => window.addEventListener("popstate", fn),
});
