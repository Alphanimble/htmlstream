import { describe, expect, it } from "vitest";
import {
  assembleStreamHtml,
  extractCompleteRows,
  firstCompleteTableEnd,
  initTableRowCountsFromTrack,
  patchStreamingHtml,
  resolveStreamCaretRange,
  shouldShowStreamingCaret,
  stripCaret,
  syncStreamingCaret,
} from "../src/patch-streaming-html";
import { ULTIMATE_SHOWCASE } from "./fixtures/ultimate-showcase";
import { rehtml } from "../src/rehtml";
import { sanitizeHtml } from "../src/sanitize";
import { DATA_TABLE } from "./fixtures/visual-html";

describe("patchStreamingHtml", () => {
  it("sanitize keeps table cell content in fragment context", () => {
    const wrapped = sanitizeHtml(
      "<table><tbody><tr><td>2</td></tr></tbody></table>",
    );
    expect(wrapped).toContain(">2<");
  });

  it("appends table rows incrementally", () => {
    const container = document.createElement("div");
    container.innerHTML = `<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>`;
    container.querySelector("table")!.dataset.shRowCount = "1";

    const next =
      '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table>';
    const prev =
      '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';

    const patched = patchStreamingHtml(container, next, next, prev);
    expect(patched).toBe(true);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(container.querySelector("tbody tr:last-child td")?.textContent).toBe(
      "2",
    );
  });

  it("appends inline suffix without full replace", () => {
    const container = document.createElement("div");
    container.innerHTML = "Hello";
    const prev = "Hello";
    const next = "Hello world";

    const patched = patchStreamingHtml(container, next, next, prev);
    expect(patched).toBe(true);
    expect(container.textContent).toBe("Hello world");
    expect(container.querySelector(".sh-stream-chunk")?.textContent).toBe(" world");
  });

  it("streams text inside an open element instead of at container root", () => {
    const container = document.createElement("div");
    container.innerHTML = '<div class="callout info"></div>';
    const prev = '<div class="callout info">';
    const next = '<div class="callout info">FY2025 revenue';

    const patched = patchStreamingHtml(
      container,
      `${next}</div>`,
      next,
      prev,
    );
    expect(patched).toBe(true);
    expect(container.querySelector(".callout")?.textContent).toBe(
      "FY2025 revenue",
    );
    expect(
      container.querySelector(".callout .sh-stream-chunk")?.textContent,
    ).toBe("FY2025 revenue");
  });

  it("stripCaret removes caret span", () => {
    const html = 'text<span class="sh-caret" aria-hidden="true"></span>';
    expect(stripCaret(html)).toBe("text");
  });

  it("does not accumulate carets when the open tag stack changes", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const steps = [
      "<p>hello",
      "<div><p>hello",
      "<div><p>hello world</p><ul><li>one",
      "<div><p>hello world</p><ul><li>one</li><li>two",
    ];
    const caret = '<span class="sh-caret" aria-hidden="true"></span>';

    for (const partial of steps) {
      syncStreamingCaret(container, partial + caret, partial);
    }

    expect(container.querySelectorAll(".sh-caret")).toHaveLength(1);
    container.remove();
  });

  it("resolveStreamCaretRange targets last streamed text, not after closed blocks", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>hello</p><p>streaming</p>";

    const { range } = resolveStreamCaretRange(
      container,
      "<p>hello</p><p>streaming",
    );
    expect(range.startContainer).toBe(container.querySelectorAll("p")[1]!.firstChild);
    expect(range.startOffset).toBe("streaming".length);
  });

  it("resolveStreamCaretRange follows text inside open tag stack", () => {
    const container = document.createElement("div");
    container.innerHTML = "<div><p>hello world</p><ul><li>one</li><li>tw</li></ul></div>";

    const { range } = resolveStreamCaretRange(
      container,
      "<div><p>hello world</p><ul><li>one</li><li>tw",
    );
    expect(range.startContainer.textContent).toBe("tw");
    expect(range.startOffset).toBe(2);
  });

  it("shouldShowStreamingCaret is true only while text streams into text elements", () => {
    expect(shouldShowStreamingCaret("")).toBe(false);
    expect(shouldShowStreamingCaret("<p>hello</p>")).toBe(false);
    expect(shouldShowStreamingCaret("<p>")).toBe(false);
    expect(shouldShowStreamingCaret("<div><p>done</p>")).toBe(false);
    expect(shouldShowStreamingCaret("<hr>")).toBe(false);
    expect(shouldShowStreamingCaret('<div class="fo')).toBe(false);
    expect(shouldShowStreamingCaret("plain text")).toBe(true);
    expect(shouldShowStreamingCaret("<p>hello")).toBe(true);
    expect(shouldShowStreamingCaret("<strong>bold")).toBe(true);
    expect(shouldShowStreamingCaret("<p>hello</p>more")).toBe(true);
    expect(shouldShowStreamingCaret("<div><p>done</p>more")).toBe(true);
    expect(shouldShowStreamingCaret("<ul><li>one</li><li>tw")).toBe(true);
  });

  it("syncStreamingCaret hides the caret when the track is fully closed", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = "<p>hello</p>";

    const caret = '<span class="sh-caret" aria-hidden="true"></span>';
    syncStreamingCaret(container, "<p>hello</p>" + caret, "<p>hello</p>");

    const node = container.querySelector(".sh-caret-float");
    expect(node).not.toBeNull();
    expect(node!.classList.contains("sh-caret-hidden")).toBe(true);

    syncStreamingCaret(container, "<p>hello</p><p>next" + caret, "<p>hello</p><p>next");
    expect(node!.classList.contains("sh-caret-hidden")).toBe(false);

    container.remove();
  });

  it("extractCompleteRows finds all tr elements with cells", () => {
    const rows = extractCompleteRows(
      "<table><tr><td>a</td></tr><tr><td>b</td></tr></table>",
    );
    expect(rows).toHaveLength(2);
  });

  it("assembles full data table", () => {
    const prefix = '<div class="callout">FY2025</div>';
    const full = prefix + DATA_TABLE;
    const track = rehtml(full, { closeTags: false, splitBlocks: false }).live;
    const assembled = assembleStreamHtml(track);
    expect(assembled).toContain("Churn");
    expect(assembled.match(/<tr/gi)?.length).toBeGreaterThanOrEqual(5);
  });

  it("assembleStreamHtml keeps markup after the first closed table", () => {
    const track =
      '<table class="rt"><tr><td>A</td></tr></table><div class="section-h">Next section</div>';
    const assembled = assembleStreamHtml(track);
    expect(assembled).toContain("Next section");
    expect(firstCompleteTableEnd(track, track.indexOf("<table"))).toBeGreaterThan(
      0,
    );
  });

  it("streams content after the first table closes", () => {
    const intro =
      '<div class="callout">Intro</div><table class="rt"><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
    const metrics =
      '<div class="section-h">Metrics</div><div class="metrics"><div class="metric good"><div class="metric-val">99</div></div></div>';
    const full = intro + metrics;

    const container = document.createElement("div");
    document.body.appendChild(container);

    let prev = "";
    for (let i = 8; i <= full.length; i += 8) {
      const chunk = full.slice(0, i);
      if (
        !patchStreamingHtml(
          container,
          assembleStreamHtml(chunk),
          chunk,
          prev,
        )
      ) {
        container.innerHTML = assembleStreamHtml(chunk);
        initTableRowCountsFromTrack(container, chunk);
      }
      prev = chunk;
    }

    expect(container.querySelector(".sh-post-table")).toBeTruthy();
    expect(container.querySelector(".metric-val")?.textContent).toBe("99");
    container.remove();
  });

  it("does not duplicate rows while streaming malformed table HTML", () => {
    const prefix = '<div class="callout">Before</div>';
    const broken =
      '<table class="rt"><tr><td>Cell with no closing tags\n<tr><td>Second row also naked</table>';
    const full = prefix + broken;

    const container = document.createElement("div");
    document.body.appendChild(container);

    let prev = "";
    for (let i = 6; i <= full.length; i += 6) {
      const chunk = full.slice(0, i);
      if (
        !patchStreamingHtml(
          container,
          assembleStreamHtml(chunk),
          chunk,
          prev,
        )
      ) {
        container.innerHTML = assembleStreamHtml(chunk);
        initTableRowCountsFromTrack(container, chunk);
      }
      prev = chunk;
    }

    const rows = container.querySelectorAll("tbody tr, table tr");
    expect(rows.length).toBeLessThanOrEqual(3);
    expect(
      [...container.querySelectorAll("td")].filter((td) =>
        td.textContent?.includes("Second row also naked"),
      ).length,
    ).toBeLessThanOrEqual(1);
    container.remove();
  });

  it("ultimate showcase intro streams through checklist into section 1", () => {
    const tableEnd = ULTIMATE_SHOWCASE.indexOf("</table>") + "</table>".length;
    const mid = ULTIMATE_SHOWCASE.slice(0, tableEnd + 120);

    const container = document.createElement("div");
    document.body.appendChild(container);

    let prev = "";
    for (let i = 20; i <= mid.length; i += 20) {
      const chunk = ULTIMATE_SHOWCASE.slice(0, i);
      if (
        !patchStreamingHtml(
          container,
          assembleStreamHtml(chunk),
          chunk,
          prev,
        )
      ) {
        container.innerHTML = assembleStreamHtml(chunk);
        initTableRowCountsFromTrack(container, chunk);
      }
      prev = chunk;
    }

    expect(container.querySelector(".sh-post-table")).toBeTruthy();
    expect(container.textContent).toMatch(/§1|Metrics grid|metric-val/i);
    container.remove();
  });

  it("does not treat partial header as complete before </tr> in track", () => {
    const prefix = '<div class="callout">FY2025</div>';
    const partial = `${prefix}<table class="rt"><thead><tr><th>Region</th><th>Users</th>`;
    const track = rehtml(partial, { closeTags: false, splitBlocks: false }).live;
    const assembled = assembleStreamHtml(track);
    expect(assembled).toContain('data-sh-partial="1"');
    expect(assembled).toContain("<th>Region</th>");
    expect(extractCompleteRows(track.slice(track.indexOf("<table")))).toHaveLength(
      0,
    );
  });

  it("does not duplicate header after fallback then patch", () => {
    const prefix = '<div class="callout">FY2025</div>';
    const partial = `${prefix}<table class="rt"><thead><tr><th>Region</th><th>Users</th><th>Revenue</th><th>Churn</th>`;
    const track = rehtml(partial, { closeTags: false, splitBlocks: false }).live;

    const container = document.createElement("div");
    container.innerHTML = assembleStreamHtml(track);
    initTableRowCountsFromTrack(container, track);

    expect(
      patchStreamingHtml(container, assembleStreamHtml(track), track, prefix),
    ).toBe(true);
    expect(container.querySelectorAll("thead tr")).toHaveLength(1);
    expect(container.querySelectorAll("thead th")).toHaveLength(4);
  });
});
