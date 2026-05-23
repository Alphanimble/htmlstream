import { describe, expect, it } from "vitest";
import {
  closeOpenTags,
  rehtml,
  splitHtmlIntoBlocks,
  stripIncompleteTag,
} from "../src/rehtml";

describe("stripIncompleteTag", () => {
  it("removes trailing incomplete opening tag", () => {
    expect(stripIncompleteTag('<div class="met')).toBe("");
    expect(stripIncompleteTag("Hello <str")).toBe("Hello");
  });

  it("preserves complete tags", () => {
    expect(stripIncompleteTag("<div>hello</div>")).toBe("<div>hello</div>");
  });

  it("does not strip < inside pre/code", () => {
    expect(stripIncompleteTag("<pre>if (x < 10")).toBe("<pre>if (x < 10");
    expect(stripIncompleteTag("<code>a < b")).toBe("<code>a < b");
  });

  it("strips lone trailing opening bracket", () => {
    expect(stripIncompleteTag("Hello world<")).toBe("Hello world");
    expect(stripIncompleteTag("Some text <")).toBe("Some text");
    expect(stripIncompleteTag("<")).toBe("");
  });

  it("preserves less-than in text when not starting a tag", () => {
    expect(stripIncompleteTag("if (a < b)")).toBe("if (a < b)");
  });

  it("strips incomplete closing tag", () => {
    expect(stripIncompleteTag("<div>hello</d")).toBe("<div>hello");
  });
});

describe("closeOpenTags", () => {
  it("closes unclosed inline tags", () => {
    expect(closeOpenTags("<strong>bold")).toBe("<strong>bold</strong>");
    expect(closeOpenTags("<em>one <strong>two")).toBe(
      "<em>one <strong>two</strong></em>",
    );
  });

  it("closes nested block tags", () => {
    expect(closeOpenTags('<div><p>hello')).toBe('<div><p>hello</p></div>');
  });

  it("ignores void elements", () => {
    expect(closeOpenTags("<img src='x'>text")).toBe("<img src='x'>text");
  });

  it("handles self-closing syntax", () => {
    expect(closeOpenTags("<br/>hello")).toBe("<br/>hello");
  });

  it("tolerates mismatched close tags", () => {
    expect(closeOpenTags("<div><span></div>")).toBe("<div><span></div>");
  });

  it("does not parse tags inside pre", () => {
    const input = "<pre>if (a < b && c < d)</pre>";
    expect(closeOpenTags(input)).toBe(input);
  });
});

describe("splitHtmlIntoBlocks", () => {
  it("splits completed top-level blocks", () => {
    const html = "<div>A</div><div>B</div><div>C";
    const { stable, live } = splitHtmlIntoBlocks(html);
    expect(stable).toEqual(["<div>A</div>", "<div>B</div>"]);
    expect(live).toBe("<div>C");
  });

  it("keeps nested blocks together", () => {
    const html = "<div><p>inner</p></div><div>next";
    const { stable, live } = splitHtmlIntoBlocks(html);
    expect(stable).toEqual(["<div><p>inner</p></div>"]);
    expect(live).toBe("<div>next");
  });

  it("treats inline-only content as live", () => {
    const html = "Hello <strong>world</strong>";
    const { stable, live } = splitHtmlIntoBlocks(html);
    expect(stable).toEqual([]);
    expect(live).toBe(html);
  });

  it("splits between complete tables", () => {
    const html =
      "<table><tr><td>a</td></tr></table><table><tr><td>b";
    const { stable, live } = splitHtmlIntoBlocks(html);
    expect(stable).toEqual(["<table><tr><td>a</td></tr></table>"]);
    expect(live).toBe("<table><tr><td>b");
  });
});

describe("rehtml", () => {
  it("full pipeline on streaming fragment", () => {
    const input = '<div class="metric"><span>142ms</span></d';
    const result = rehtml(input);
    expect(result.hadIncompleteTag).toBe(true);
    expect(result.stable).toEqual([]);
    expect(result.live).toContain("142ms");
    expect(result.live).toContain("</div>");
  });

  it("handles empty input", () => {
    expect(rehtml("")).toEqual({
      html: "",
      stable: [],
      live: "",
      hadIncompleteTag: false,
    });
  });

  it("commits stable blocks while streaming continues", () => {
    const part1 = '<div class="done">complete</div><div class="live">part';
    const result = rehtml(part1);
    expect(result.stable).toEqual(['<div class="done">complete</div>']);
    expect(result.live).toContain("part");
    expect(result.live).toContain("</div>");
  });

  it("can disable options", () => {
    const input = "<strong>bold";
    const closed = rehtml(input, { stripIncomplete: false, splitBlocks: false });
    expect(closed.html).toBe("<strong>bold</strong>");
  });
});

describe("streaming simulation", () => {
  const full = `<div class="metrics">
  <div class="metric"><div class="val">142ms</div></div>
</div>
<div class="callout">Done</div>`;

  it("progressively builds stable blocks", () => {
    const checkpoints = [50, 100, 150, 200, full.length];
    let maxStable = 0;

    for (const len of checkpoints) {
      const chunk = full.slice(0, len);
      const { stable } = rehtml(chunk);
      expect(stable.length).toBeGreaterThanOrEqual(maxStable);
      maxStable = stable.length;
    }

    const final = rehtml(full);
    expect(final.stable.length).toBe(2);
    expect(final.live).toBe("");
  });
});
