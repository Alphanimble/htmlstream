/** Strip streaming caret from HTML */
export function stripCaret(html: string): string {
  return html
    .replace(/<span\s+class="sh-caret"[^>]*>\s*<\/span>\s*$/i, "")
    .trimEnd();
}

/**
 * During streaming, never rewind visible content when repair shortens the
 * string (e.g. stripping a trailing incomplete tag). Keeps layout stable.
 */
export function shouldSkipStreamRewind(
  previousClean: string,
  nextClean: string,
): boolean {
  if (!previousClean || !nextClean) {
    return false;
  }
  return (
    nextClean.length < previousClean.length &&
    previousClean.startsWith(nextClean)
  );
}

/**
 * Grow-only min-height while streaming so the container never collapses
 * when waiting for the next chunk. Syncs down on real reflows so capped
 * inner overflow (e.g. max-height grids) cannot trap page scroll.
 */
export function lockStreamHeight(
  el: HTMLElement,
  streaming: boolean,
  options?: { domUpdated?: boolean },
): void {
  if (!streaming) {
    el.style.minHeight = "";
    return;
  }

  const domUpdated = options?.domUpdated !== false;
  const h = el.offsetHeight;
  const prev = Number.parseFloat(el.style.minHeight) || 0;

  if (h > prev) {
    el.style.minHeight = `${h}px`;
  } else if (domUpdated && h < prev) {
    el.style.minHeight = h > 0 ? `${h}px` : "";
  }
}

/** Clear height lock when streaming finishes */
export function unlockStreamHeight(el: HTMLElement): void {
  el.style.minHeight = "";
}

/** Damping factor for stream scroll follow (0–1). Lower = smoother lag. */
export const DEFAULT_STREAM_SCROLL_EASE = 0.18;

/**
 * Ease scrollTop toward a target. Returns true when settled.
 * Use inside a requestAnimationFrame loop while content streams.
 */
export function easeScrollTop(
  el: HTMLElement,
  targetTop: number,
  factor = DEFAULT_STREAM_SCROLL_EASE,
): boolean {
  const target = Math.max(0, targetTop);
  const delta = target - el.scrollTop;
  if (Math.abs(delta) < 0.5) {
    el.scrollTop = target;
    return true;
  }
  el.scrollTop += delta * factor;
  return false;
}

/** Ease a scroll container toward its bottom edge */
export function easeScrollToBottom(
  el: HTMLElement,
  factor = DEFAULT_STREAM_SCROLL_EASE,
): boolean {
  const target = el.scrollHeight - el.clientHeight;
  return easeScrollTop(el, target, factor);
}

/** True when the reader is within thresholdPx of the bottom edge. */
export function isNearScrollBottom(
  el: HTMLElement,
  thresholdPx = 24,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}

/** Default distance from bottom that re-enables stream follow. */
export const DEFAULT_STREAM_SCROLL_THRESHOLD = 80;

export interface StreamScrollFollow {
  paused: boolean;
  lastScrollTop: number;
}

export function createStreamScrollFollow(): StreamScrollFollow {
  return { paused: false, lastScrollTop: 0 };
}

/** Reset follow state when starting a new stream. */
export function resetStreamScrollFollow(state: StreamScrollFollow): void {
  state.paused = false;
  state.lastScrollTop = 0;
}

/**
 * Update follow state from scroll position.
 * Pauses when the reader scrolls up; resumes when they return near the bottom.
 */
export function syncStreamScrollFollow(
  el: HTMLElement,
  state: StreamScrollFollow,
  thresholdPx = DEFAULT_STREAM_SCROLL_THRESHOLD,
): void {
  if (isNearScrollBottom(el, thresholdPx)) {
    state.paused = false;
    state.lastScrollTop = el.scrollTop;
    return;
  }

  if (el.scrollTop < state.lastScrollTop - 2) {
    state.paused = true;
  }

  state.lastScrollTop = el.scrollTop;
}

/** Poll + follow each animation frame while content streams. */
export function tickStreamScrollFollow(
  el: HTMLElement,
  state: StreamScrollFollow,
  options?: { thresholdPx?: number; factor?: number },
): void {
  const threshold = options?.thresholdPx ?? DEFAULT_STREAM_SCROLL_THRESHOLD;
  const factor = options?.factor ?? DEFAULT_STREAM_SCROLL_EASE;
  syncStreamScrollFollow(el, state, threshold);
  if (!state.paused) {
    easeScrollToBottom(el, factor);
  }
}

/** Attach scroll listeners that keep follow state in sync with user intent. */
export function bindStreamScrollFollow(
  el: HTMLElement,
  state: StreamScrollFollow,
  options?: { thresholdPx?: number },
): () => void {
  const threshold = options?.thresholdPx ?? DEFAULT_STREAM_SCROLL_THRESHOLD;
  const onScroll = () => {
    syncStreamScrollFollow(el, state, threshold);
  };
  el.addEventListener("scroll", onScroll, { passive: true });
  return () => el.removeEventListener("scroll", onScroll);
}

const NESTED_SCROLL_SELECTOR =
  "pre, textarea, [data-sh-scroll], .sh-nested-scroll, .sh-thinking-body";

function isVerticallyScrollable(el: HTMLElement): boolean {
  if (el.scrollHeight <= el.clientHeight + 1) {
    return false;
  }
  const style = getComputedStyle(el);
  return (
    style.overflowY === "auto" ||
    style.overflowY === "scroll" ||
    style.overflow === "auto" ||
    style.overflow === "scroll"
  );
}

/**
 * Follow the stream inside capped overflow regions (e.g. `<pre>` code blocks).
 * During streaming (`pin: true`), always stick to the bottom like a terminal.
 * With `pin: false`, only scroll when the reader is already near the bottom.
 */
export function syncNestedStreamScroll(
  root: HTMLElement,
  options?: { pin?: boolean; smooth?: boolean; factor?: number },
): void {
  const thresholdPx = options?.pin === false ? 80 : Number.POSITIVE_INFINITY;
  const smooth = options?.smooth ?? false;
  const factor = options?.factor ?? DEFAULT_STREAM_SCROLL_EASE;

  root.querySelectorAll(NESTED_SCROLL_SELECTOR).forEach((node) => {
    const el = node as HTMLElement;
    if (!isVerticallyScrollable(el)) {
      return;
    }
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= thresholdPx) {
      if (smooth) {
        easeScrollToBottom(el, factor);
      } else {
        el.scrollTop = el.scrollHeight;
      }
    }
  });
}
