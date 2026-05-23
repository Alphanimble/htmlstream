import { describe, expect, it, beforeEach } from "vitest";
import { configureSanitizer, sanitizeHtml } from "../src/sanitize";
import {
  LATEX_HEAVY,
  SVG_BAR_CHART,
  SVG_WITH_SCRIPT_INJECTION,
} from "./fixtures/visual-html";

describe("sanitizeHtml — visual content", () => {
  beforeEach(() => {
    configureSanitizer({
      ADD_ATTR: ["target", "data-latex", "data-display"],
    });
  });

  it("preserves SVG bar chart structure", () => {
    const clean = sanitizeHtml(SVG_BAR_CHART);
    expect(clean).toContain("<svg");
    expect(clean).toContain('viewBox="0 0 400 220"');
    expect(clean).toContain("<rect");
    expect(clean).toContain('fill="#3b82f6"');
    expect(clean).toContain("<text");
  });

  it("preserves inline styles on chart elements", () => {
    const html = '<div class="bar-fill" style="width:96%; background:#dc2626"></div>';
    const clean = sanitizeHtml(html);
    expect(clean).toContain("width:96%");
  });

  it("preserves conic-gradient CSS donut", () => {
    const html =
      '<div style="background: conic-gradient(#3b82f6 0 65%, #e5e7eb 65% 100%)"></div>';
    const clean = sanitizeHtml(html);
    expect(clean).toContain("conic-gradient");
  });

  it("preserves data-latex for math rendering", () => {
    const clean = sanitizeHtml(LATEX_HEAVY);
    expect(clean).toContain("data-latex");
    expect(clean).toContain("math-block");
  });

  it("strips script tags from chart HTML", () => {
    const clean = sanitizeHtml(SVG_WITH_SCRIPT_INJECTION);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("alert");
    expect(clean).toContain("<svg");
  });

  it("strips onerror from img in chart", () => {
    const clean = sanitizeHtml(SVG_WITH_SCRIPT_INJECTION);
    expect(clean).not.toContain("onerror");
  });

  it("strips javascript: URIs in links", () => {
    const dirty =
      '<a href="javascript:alert(1)">click</a><svg><rect width="10" height="10"/></svg>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("<svg");
  });
});
