import { describe, expect, it } from "vitest";
import { closeOpenTags, rehtml, stripIncompleteTag } from "../src/rehtml";
import { SVG_BAR_CHART, SVG_LINE_CHART } from "./fixtures/visual-html";
import { streamSnapshots } from "./helpers/simulate-stream";

describe("SVG bar chart streaming", () => {
  const checkpoints = [
    40, 80, 120, 200, 350, 500, SVG_BAR_CHART.length,
  ];

  it.each(checkpoints)("chunk at %i chars — never throws", (len) => {
    expect(() => rehtml(SVG_BAR_CHART.slice(0, len))).not.toThrow();
  });

  it("progressively accumulates rect elements in closed output", () => {
    const rectCounts = streamSnapshots(SVG_BAR_CHART, 12).map(
      (s) => (s.html.match(/<rect/g) ?? []).length,
    );
    let max = 0;
    for (const c of rectCounts) {
      expect(c).toBeGreaterThanOrEqual(max);
      max = c;
    }
    expect(max).toBeGreaterThanOrEqual(5);
  });

  it("strips half-written rect tag", () => {
    const cut =
      SVG_BAR_CHART.indexOf('<rect x="200"') +
      '<rect x="200" y="65" width="60" he'.length;
    const chunk = SVG_BAR_CHART.slice(0, cut);
    const stripped = stripIncompleteTag(chunk);
    expect(stripped).not.toMatch(/<rect[^>]*he$/);
    expect(stripped).toContain('<rect x="120"');
    expect(stripped).not.toContain('x="200" y="65" width="60" he');
  });

  it("closes svg when stream stops mid-chart", () => {
    const mid = SVG_BAR_CHART.slice(0, SVG_BAR_CHART.indexOf("</svg>"));
    const closed = closeOpenTags(mid);
    expect(closed).toContain("</svg>");
    expect(closed).toContain('viewBox="0 0 400 220"');
  });

  it("preserves aria-label on svg", () => {
    expect(rehtml(SVG_BAR_CHART).html).toContain('aria-label="Bar chart"');
  });
});

describe("SVG line chart streaming", () => {
  it("handles incomplete path d attribute", () => {
    const partial = `<svg viewBox="0 0 360 180"><path d="M20 160 H3`;
    const result = rehtml(partial);
    expect(result.hadIncompleteTag).toBe(true);
  });

  it("closes polyline and circles when truncated", () => {
    const cut = SVG_LINE_CHART.indexOf("<circle cx=\"320\"");
    const partial = SVG_LINE_CHART.slice(0, cut + 20);
    const closed = closeOpenTags(partial);
    expect(closed).toContain("<polyline");
    expect(closed).toContain("</svg>");
  });

  it("does not treat < in path data as tag (path is self-contained)", () => {
    const withPath = `<svg><path d="M10 10 L20 20"/></svg>`;
    expect(rehtml(withPath).html).toBe(withPath);
  });
});

describe("chart + table combo stream", () => {
  const combo = `${SVG_BAR_CHART}\n${SVG_LINE_CHART}`;

  it("commits first chart before second starts", () => {
    const mid = combo.slice(0, SVG_BAR_CHART.length + 50);
    const { stable, live } = rehtml(mid);
    expect(stable.some((b) => b.includes("Bar chart"))).toBe(true);
    expect(live).toContain("chart-wrap");
  });

  it("char stream through two SVGs completes cleanly", () => {
    const final = streamSnapshots(combo, 3).at(-1)!;
    expect(final.html).toContain("</svg>");
    expect((final.html.match(/<\/svg>/g) ?? []).length).toBe(2);
  });
});
