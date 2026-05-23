import katex from "katex";

/** Balanced-brace check — skip typesetting while latex attribute is still streaming */
export function isLatexReady(latex: string): boolean {
  if (!latex.trim()) return false;

  let depth = 0;
  for (const ch of latex) {
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth < 0) return false;
    }
  }

  return depth === 0;
}

/** Typeset [data-latex] elements; incomplete formulas keep a stable placeholder. */
export function renderMath(root: HTMLElement, streaming = false): void {
  root.querySelectorAll("[data-latex]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const latex = el.getAttribute("data-latex");
    if (!latex?.trim()) return;

    const display =
      el.classList.contains("math-block") ||
      el.getAttribute("data-display") === "true";

    if (streaming && !isLatexReady(latex)) {
      if (!el.dataset.katexPlaceholder) {
        el.innerHTML = "";
        el.dataset.katexPlaceholder = "1";
      }
      return;
    }

    if (el.dataset.katexSrc === latex) return;

    try {
      katex.render(latex, el, {
        displayMode: display,
        throwOnError: false,
        strict: "ignore",
      });
      el.dataset.katexSrc = latex;
      delete el.dataset.katexPlaceholder;
    } catch {
      // retry next chunk
    }
  });
}
