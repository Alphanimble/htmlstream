/** Time constant for exponential smoothing (ms). Lower = snappier. */
const SMOOTH_TAU_X_MS = 28;
const SMOOTH_TAU_Y_MS = 48;
const SNAP_PX = 0.35;

interface CaretMotionState {
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  lastFrame: number;
  rafId: number;
}

const motionByCaret = new WeakMap<HTMLElement, CaretMotionState>();

function removeInlineCarets(container: HTMLElement): void {
  container
    .querySelectorAll(".sh-caret:not(.sh-caret-float)")
    .forEach((node) => node.remove());
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  );
}

function initFloatingCaret(caret: HTMLElement): void {
  if (caret.dataset.floatInit === "1") {
    return;
  }
  caret.dataset.floatInit = "1";
  caret.classList.add("sh-caret-float");
  caret.style.position = "absolute";
  caret.style.left = "0";
  caret.style.top = "0";
  caret.style.margin = "0";
  caret.style.transition = "none";
}

function cancelCaretMotion(caret: HTMLElement): void {
  const motion = motionByCaret.get(caret);
  if (motion?.rafId) {
    cancelAnimationFrame(motion.rafId);
    motion.rafId = 0;
  }
}

function ensureCaretMotion(caret: HTMLElement): CaretMotionState {
  let motion = motionByCaret.get(caret);
  if (!motion) {
    motion = {
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      lastFrame: 0,
      rafId: 0,
    };
    motionByCaret.set(caret, motion);
  }
  return motion;
}

function applyCaretTransform(caret: HTMLElement, x: number, y: number): void {
  caret.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function animateCaretFrame(caret: HTMLElement, time: number): void {
  const motion = motionByCaret.get(caret);
  if (!motion) {
    return;
  }

  const dt = Math.min(32, Math.max(0, time - motion.lastFrame));
  motion.lastFrame = time;

  const alphaX = 1 - Math.exp(-dt / SMOOTH_TAU_X_MS);
  const alphaY = 1 - Math.exp(-dt / SMOOTH_TAU_Y_MS);
  motion.currentX += (motion.targetX - motion.currentX) * alphaX;
  motion.currentY += (motion.targetY - motion.currentY) * alphaY;

  applyCaretTransform(caret, motion.currentX, motion.currentY);

  const dx = Math.abs(motion.targetX - motion.currentX);
  const dy = Math.abs(motion.targetY - motion.currentY);

  if (dx > SNAP_PX || dy > SNAP_PX) {
    motion.rafId = requestAnimationFrame((next) => animateCaretFrame(caret, next));
    return;
  }

  motion.currentX = motion.targetX;
  motion.currentY = motion.targetY;
  applyCaretTransform(caret, motion.currentX, motion.currentY);
  motion.rafId = 0;
}

function moveCaretTo(
  caret: HTMLElement,
  x: number,
  y: number,
  instant: boolean,
): void {
  initFloatingCaret(caret);

  const motion = ensureCaretMotion(caret);
  motion.targetX = x;
  motion.targetY = y;

  caret.dataset.x = String(x);
  caret.dataset.y = String(y);

  if (instant || prefersReducedMotion()) {
    cancelCaretMotion(caret);
    motion.currentX = x;
    motion.currentY = y;
    motion.lastFrame = performance.now();
    applyCaretTransform(caret, x, y);
    return;
  }

  if (!motion.rafId) {
    motion.lastFrame = performance.now();
    motion.rafId = requestAnimationFrame((time) => animateCaretFrame(caret, time));
  }
}

function readRect(
  range: Range,
  fallback: Element,
): DOMRect | { width: number; height: number; left: number; top: number; right: number; bottom: number } {
  if (typeof range.getBoundingClientRect === "function") {
    return range.getBoundingClientRect();
  }
  return fallback.getBoundingClientRect();
}

function measureCaretPointFromRange(
  host: HTMLElement,
  range: Range,
  fallback: Element,
): { x: number; y: number } {
  const hostRect = host.getBoundingClientRect();
  const scrollX = host.scrollLeft;
  const scrollY = host.scrollTop;

  let rect = readRect(range, fallback);

  if (rect.width === 0 && rect.height === 0) {
    const anchor =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : (range.startContainer.parentElement ?? fallback);
    rect = anchor.getBoundingClientRect();
    return {
      x: rect.left - hostRect.left + scrollX,
      y: rect.top - hostRect.top + scrollY,
    };
  }

  return {
    x: rect.right - hostRect.left + scrollX,
    y: rect.bottom - hostRect.top + scrollY,
  };
}

function measureCaretCoords(
  host: HTMLElement,
  range: Range,
  fallback: Element,
  caret: HTMLElement,
): { x: number; y: number } {
  const { x, y: rawY } = measureCaretPointFromRange(host, range, fallback);
  const caretHeight =
    caret.offsetHeight ||
    Number.parseFloat(getComputedStyle(caret).height) ||
    16;
  return { x, y: rawY - caretHeight };
}

function shouldSnapCaret(caret: HTMLElement): boolean {
  if (caret.dataset.x === undefined) {
    return true;
  }
  if (caret.dataset.snapNext === "1") {
    delete caret.dataset.snapNext;
    return true;
  }
  return false;
}

export function acquireStreamingCaret(container: HTMLElement): HTMLSpanElement {
  removeInlineCarets(container);

  let caret = container.querySelector<HTMLSpanElement>(":scope > .sh-caret-float");
  if (!caret) {
    caret = document.createElement("span");
    caret.className = "sh-caret sh-caret-float";
    caret.setAttribute("aria-hidden", "true");
    container.appendChild(caret);
  }

  initFloatingCaret(caret);
  return caret;
}

export function positionStreamingCaret(
  caret: HTMLElement,
  host: HTMLElement,
  anchor: Element,
  mode: "inside-end" | "after",
): void {
  const hostRect = host.getBoundingClientRect();
  const scrollX = host.scrollLeft;
  const scrollY = host.scrollTop;

  let x: number;
  let y: number;

  if (mode === "after") {
    const rect = anchor.getBoundingClientRect();
    x = rect.right - hostRect.left + scrollX;
    y = rect.bottom - hostRect.top + scrollY;
  } else {
    const range = document.createRange();
    range.selectNodeContents(anchor);
    range.collapse(false);
    ({ x, y } = measureCaretCoords(host, range, anchor, caret));
  }

  moveCaretTo(caret, x, y, shouldSnapCaret(caret));
}

export function placeCaretAfterElement(
  caret: HTMLSpanElement,
  host: HTMLElement,
  element: Element,
): void {
  positionStreamingCaret(caret, host, element, "after");
}

export function moveCaretToElement(
  caret: HTMLSpanElement,
  host: HTMLElement,
  target: HTMLElement,
): void {
  positionStreamingCaret(caret, host, target, "inside-end");
}

/** Position the floating caret at an exact DOM range (stream text tail). */
export function positionStreamingCaretAtRange(
  caret: HTMLElement,
  host: HTMLElement,
  range: Range,
  fallback: Element,
): void {
  const { x, y } = measureCaretCoords(host, range, fallback, caret);
  moveCaretTo(caret, x, y, shouldSnapCaret(caret));
}

export function setStreamingCaretVisible(
  caret: HTMLElement,
  visible: boolean,
): void {
  const wasHidden = caret.classList.contains("sh-caret-hidden");
  caret.classList.toggle("sh-caret-hidden", !visible);

  if (!visible) {
    cancelCaretMotion(caret);
    return;
  }

  if (wasHidden) {
    caret.dataset.snapNext = "1";
  }
}
