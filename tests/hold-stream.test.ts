import { describe, expect, it } from "vitest";
import {
  createStreamScrollFollow,
  easeScrollTop,
  lockStreamHeight,
  shouldSkipStreamRewind,
  syncNestedStreamScroll,
  syncStreamScrollFollow,
  unlockStreamHeight,
} from "../src/hold-stream";

describe("shouldSkipStreamRewind", () => {
  it("detects repair-induced shortening", () => {
    const prev = '<div class="metric"><span>142';
    const next = '<div class="metric">';
    expect(shouldSkipStreamRewind(prev, next)).toBe(true);
  });

  it("allows forward progress", () => {
    const prev = "<div>hello";
    const next = "<div>hello world";
    expect(shouldSkipStreamRewind(prev, next)).toBe(false);
  });
});

describe("lockStreamHeight", () => {
  it("clears min-height on unlock", () => {
    const el = document.createElement("div");
    el.style.minHeight = "100px";
    unlockStreamHeight(el);
    expect(el.style.minHeight).toBe("");
  });

  it("syncs min-height down after real reflow shrink", () => {
    const el = document.createElement("div");
    let height = 200;
    Object.defineProperty(el, "offsetHeight", {
      configurable: true,
      get: () => height,
    });

    lockStreamHeight(el, true, { domUpdated: true });
    expect(Number.parseFloat(el.style.minHeight)).toBe(200);

    height = 80;
    lockStreamHeight(el, true, { domUpdated: true });
    expect(Number.parseFloat(el.style.minHeight)).toBe(80);
  });

  it("preserves min-height when domUpdated is false", () => {
    const el = document.createElement("div");
    el.style.minHeight = "200px";
    Object.defineProperty(el, "offsetHeight", { configurable: true, value: 80 });

    lockStreamHeight(el, true, { domUpdated: false });
    expect(el.style.minHeight).toBe("200px");
  });
});

describe("easeScrollTop", () => {
  it("moves toward target and settles", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    let settled = false;
    for (let i = 0; i < 40 && !settled; i++) {
      settled = easeScrollTop(el, 200, 0.25);
    }
    expect(settled).toBe(true);
    expect(el.scrollTop).toBe(200);
  });
});

describe("syncNestedStreamScroll", () => {
  it("scrolls nested pre to bottom when reader is pinned there", () => {
    const root = document.createElement("div");
    const pre = document.createElement("pre");
    pre.className = "code-block";
    pre.style.overflow = "auto";
    pre.textContent = "line\n".repeat(40);
    root.appendChild(pre);
    document.body.appendChild(root);

    Object.defineProperty(pre, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(pre, "scrollHeight", { configurable: true, value: 400 });
    pre.scrollTop = 250;

    syncNestedStreamScroll(root);
    expect(pre.scrollTop).toBeGreaterThanOrEqual(250);

    root.remove();
  });

  it("does not scroll nested pre when reader scrolled up inside it", () => {
    const root = document.createElement("div");
    const pre = document.createElement("pre");
    pre.style.overflow = "auto";
    pre.textContent = "line\n".repeat(40);
    root.appendChild(pre);
    document.body.appendChild(root);

    Object.defineProperty(pre, "clientHeight", { configurable: true, value: 100 });
    Object.defineProperty(pre, "scrollHeight", { configurable: true, value: 400 });
    pre.scrollTop = 50;

    syncNestedStreamScroll(root, { pin: false });
    expect(pre.scrollTop).toBe(50);

    root.remove();
  });
});

describe("syncStreamScrollFollow", () => {
  function mockScrollEl(scrollTop: number, scrollHeight: number, clientHeight: number) {
    const el = document.createElement("div");
    let top = scrollTop;
    Object.defineProperty(el, "scrollTop", {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        top = value;
      },
    });
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
    return el;
  }

  it("pauses when the reader scrolls up", () => {
    const el = mockScrollEl(100, 1000, 400);
    const state = createStreamScrollFollow();
    state.lastScrollTop = 100;
    el.scrollTop = 60;
    syncStreamScrollFollow(el, state);
    expect(state.paused).toBe(true);
  });

  it("resumes when the reader returns near the bottom", () => {
    const el = mockScrollEl(550, 1000, 400);
    const state = createStreamScrollFollow();
    state.paused = true;
    state.lastScrollTop = 200;
    syncStreamScrollFollow(el, state);
    expect(state.paused).toBe(false);
  });
});
