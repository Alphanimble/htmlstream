import { describe, expect, it } from "vitest";
import { rehtml } from "../src/rehtml";
import { sanitizeHtml } from "../src/sanitize";
import {
  ULTIMATE_SHOWCASE,
  ULTIMATE_SHOWCASE_SECTIONS,
} from "./fixtures/ultimate-showcase";
import { streamSnapshots } from "./helpers/simulate-stream";

describe("ULTIMATE_SHOWCASE", () => {
  it("is a substantial multi-section payload", () => {
    expect(ULTIMATE_SHOWCASE.length).toBeGreaterThan(25_000);
    expect(ULTIMATE_SHOWCASE_SECTIONS.length).toBeGreaterThanOrEqual(10);
  });

  it("includes every major capability marker", () => {
    expect(ULTIMATE_SHOWCASE).toContain("<animate");
    expect(ULTIMATE_SHOWCASE).toContain("data-latex");
    expect(ULTIMATE_SHOWCASE).toContain("<table");
    expect(ULTIMATE_SHOWCASE).toContain("colspan");
    expect(ULTIMATE_SHOWCASE).toContain("<pre");
    expect(ULTIMATE_SHOWCASE).toContain("metric good");
  });

  it("sanitizes without stripping SMIL or math attrs", () => {
    const clean = sanitizeHtml(ULTIMATE_SHOWCASE);
    expect(clean).toContain("<animate");
    expect(clean).toContain("data-latex");
    expect(clean).not.toContain("<script");
  });

  it("streams char-by-char without repair regressions", () => {
    const snapshots = streamSnapshots(ULTIMATE_SHOWCASE, 12, {
      closeTags: false,
    });
    let maxStable = 0;
    for (const snap of snapshots) {
      expect(snap.stable.length).toBeGreaterThanOrEqual(maxStable);
      maxStable = snap.stable.length;
    }
    expect(snapshots.at(-1)?.html.length).toBeGreaterThan(0);
  });

  it("closes cleanly at end of stream", () => {
    const { html, hadIncompleteTag } = rehtml(ULTIMATE_SHOWCASE);
    expect(hadIncompleteTag).toBe(false);
    expect(html).toContain("End of showcase");
  });
});
