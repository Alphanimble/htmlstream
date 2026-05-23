import { describe, expect, it } from "vitest";
import { closeOpenTags, rehtml } from "../src/rehtml";
import {
  CODE_DIFF,
  COMPARISON_GRID,
  CSS_DONUT_CHART,
  DATA_TABLE,
  FULL_DASHBOARD,
  LATEX_HEAVY,
  MESSY_LLM_NESTING,
  METRICS_DASHBOARD,
  SVG_BAR_CHART,
  SVG_LINE_CHART,
  TIMELINE,
} from "./fixtures/visual-html";
import {
  assertMonotonicStable,
  countIncompleteStrips,
  streamSnapshots,
} from "./helpers/simulate-stream";

describe("visual fixtures — streaming simulation", () => {
  const fixtures = [
    ["metrics dashboard", METRICS_DASHBOARD],
    ["SVG bar chart", SVG_BAR_CHART],
    ["SVG line chart", SVG_LINE_CHART],
    ["CSS donut chart", CSS_DONUT_CHART],
    ["comparison grid", COMPARISON_GRID],
    ["code diff", CODE_DIFF],
    ["timeline", TIMELINE],
    ["data table", DATA_TABLE],
    ["LaTeX heavy", LATEX_HEAVY],
    ["full dashboard", FULL_DASHBOARD],
    ["messy LLM nesting", MESSY_LLM_NESTING],
  ] as const;

  it.each(fixtures)(
    "%s — stable blocks grow monotonically (chunk=6)",
    (_name, html) => {
      const snaps = streamSnapshots(html, 6);
      assertMonotonicStable(snaps);
    },
  );

  it.each(fixtures)(
    "%s — final parse has empty live tail",
    (_name, html) => {
      const final = rehtml(html);
      expect(final.live).toBe("");
      expect(final.stable.length).toBeGreaterThan(0);
    },
  );

  it.each(fixtures)(
    "%s — char-by-char stream eventually completes",
    (_name, html) => {
      const snaps = streamSnapshots(html, 1);
      expect(snaps.at(-1)?.html).toBe(rehtml(html).html);
    },
  );

  it("full dashboard — hits incomplete-tag stripping many times", () => {
    const snaps = streamSnapshots(FULL_DASHBOARD, 4);
    expect(countIncompleteStrips(snaps)).toBeGreaterThan(10);
  });

  it("full dashboard — commits multiple stable blocks", () => {
    const final = rehtml(FULL_DASHBOARD);
    expect(final.stable.length).toBeGreaterThanOrEqual(4);
  });
});

describe("visual fixtures — streaming-safe mode", () => {
  it("does not auto-close during simulated stream", () => {
    const chunk = METRICS_DASHBOARD.slice(0, 120);
    const streaming = rehtml(chunk, { closeTags: false, splitBlocks: false });
    expect(streaming.live).not.toMatch(/<\/div>\s*<\/div>\s*<\/div>\s*$/);
    expect(streaming.live).toContain("metric");
  });

  it("applies full repair only when stream completes", () => {
    const partial = SVG_BAR_CHART.slice(0, 200);
    const mid = rehtml(partial, { closeTags: false });
    const done = rehtml(SVG_BAR_CHART);
    expect(mid.html).not.toContain("</svg>");
    expect(done.html).toContain("</svg>");
  });
});

describe("visual fixtures — repair edge cases", () => {
  it("closes deeply nested metrics mid-stream", () => {
    const partial =
      '<div class="metrics"><div class="metric good"><div class="metric-val">142ms</div><div class="bar-wrap"><div class="bar-fill" style="width:14%">';
    const closed = closeOpenTags(partial);
    expect(closed).toContain("142ms");
    expect(closed).toContain('style="width:14%"');
    expect(closed.match(/<div/g)?.length).toBe(closed.match(/<\/div>/g)?.length);
  });

  it("strips incomplete SVG rect attribute", () => {
    const partial = `<svg viewBox="0 0 100 100"><rect x="10" y="20" width="30" he`;
    const result = rehtml(partial);
    expect(result.hadIncompleteTag).toBe(true);
    expect(result.live).not.toContain("<rect");
    expect(result.live).toContain("<svg");
  });

  it("handles incomplete polyline points mid-attribute", () => {
    const partial = `<svg><polyline points="20,150 80,120 140,`;
    const result = rehtml(partial);
    expect(result.hadIncompleteTag).toBe(true);
  });

  it("preserves inline styles on bar-fill divs", () => {
    const result = rehtml(METRICS_DASHBOARD);
    expect(result.html).toContain('style="width:14%"');
    expect(result.html).toContain('style="width:96%"');
  });

  it("keeps data-latex attributes through repair", () => {
    const result = rehtml(LATEX_HEAVY);
    expect(result.html).toContain('data-latex="e^{i\\pi} + 1 = 0"');
    expect(result.html).toContain("math-block");
  });

  it("repairs messy nested inline tags", () => {
    const partial = `<div><div><span><strong>Bold <em>and <u>nested`;
    const closed = closeOpenTags(partial);
    expect(closed).toContain("</u></em></strong>");
  });

  it("comparison grid — two columns stable as single blocks", () => {
    const final = rehtml(COMPARISON_GRID);
    expect(final.stable).toHaveLength(1);
    expect(final.stable[0]).toContain("cmp-col");
    expect(final.stable[0]).toMatch(/React.*Vue/s);
  });

  it("table stays atomic until fully closed", () => {
    const partial = DATA_TABLE.slice(0, DATA_TABLE.indexOf("</tr>") + 5);
    const { stable, live } = rehtml(partial);
    expect(stable).toHaveLength(0);
    expect(live).toContain("<table");
  });
});
