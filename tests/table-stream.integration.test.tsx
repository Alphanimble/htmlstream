import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { rehtml } from "../src/rehtml";
import { sanitizeHtml } from "../src/sanitize";
import { StreamHtml } from "../src/streamhtml";
import { DATA_TABLE } from "./fixtures/visual-html";

const PREFIX = `<div class="callout info">FY2025 revenue breakdown by region.</div>`;
const FULL = PREFIX + DATA_TABLE;

describe("table streaming — regional revenue", () => {
  it("track never closes header row before all th cells", () => {
    const headerClose = FULL.indexOf("</tr>");
    for (let i = 50; i <= headerClose + 1; i++) {
      const track = rehtml(FULL.slice(0, i), {
        closeTags: false,
        splitBlocks: false,
      }).live;
      const thead = track.slice(track.indexOf("<thead"));
      if (thead.includes("</tr>")) {
        expect(thead).toContain("Churn");
        return;
      }
    }
  });
  it("never has duplicate thead rows during cumulative stream", () => {
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{FULL.slice(0, 1)}</StreamHtml>,
    );

    let maxTheadRows = 0;
    for (let i = 8; i <= FULL.length; i += 8) {
      rerender(<StreamHtml isStreaming={true}>{FULL.slice(0, i)}</StreamHtml>);
      maxTheadRows = Math.max(
        maxTheadRows,
        container.querySelectorAll("thead tr").length,
      );
    }

    expect(maxTheadRows).toBeLessThanOrEqual(1);
  });

  it("shows header columns forming one by one", () => {
    const tableStart = FULL.indexOf("<table");
    const headerEnd = FULL.indexOf("</tr>") + 5;
    const thCounts: number[] = [];

    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{FULL.slice(0, tableStart)}</StreamHtml>,
    );

    for (let i = tableStart + 1; i <= headerEnd; i += 3) {
      rerender(<StreamHtml isStreaming={true}>{FULL.slice(0, i)}</StreamHtml>);
      thCounts.push(container.querySelectorAll("th").length);
    }

    expect(Math.max(...thCounts)).toBeGreaterThanOrEqual(2);
  });

  it("renders all body rows when streamed in one shot", () => {
    const { container } = render(
      <StreamHtml isStreaming={true}>{FULL}</StreamHtml>,
    );
    expect(container.querySelectorAll("tbody tr").length).toBe(4);
  });

  it("grows row count incrementally during cumulative stream", () => {
    const rowCounts: number[] = [];
    const thCounts: number[] = [];

    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{FULL.slice(0, 1)}</StreamHtml>,
    );

    for (let i = 8; i <= FULL.length; i += 8) {
      rerender(<StreamHtml isStreaming={true}>{FULL.slice(0, i)}</StreamHtml>);
      rowCounts.push(container.querySelectorAll("tr").length);
      thCounts.push(container.querySelectorAll("th").length);
    }
    rerender(<StreamHtml isStreaming={true}>{FULL}</StreamHtml>);

    const tbodyCount = container.querySelectorAll("tbody tr").length;

    expect(rowCounts[rowCounts.length - 1]).toBeGreaterThan(rowCounts[0] ?? 0);
    expect(tbodyCount).toBe(4);
    expect(container.querySelectorAll("thead tr").length).toBe(1);
    expect(container.querySelectorAll("thead th").length).toBe(4);
  });

  it("streams callout text inside the callout box during cumulative stream", () => {
    const html = `<div class="callout info">FY2025 revenue breakdown by region.</div>`;
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{html.slice(0, 1)}</StreamHtml>,
    );

    let sawTextInsideCallout = false;
    for (let i = 8; i <= html.length; i += 8) {
      rerender(<StreamHtml isStreaming={true}>{html.slice(0, i)}</StreamHtml>);
      const callout = container.querySelector(".callout");
      const orphanText = [...container.querySelector(".sh-live")!.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent?.trim()?.length ?? 0) > 0,
      );
      if (
        callout &&
        (callout.textContent?.length ?? 0) > 0 &&
        !orphanText
      ) {
        sawTextInsideCallout = true;
      }
    }

    expect(sawTextInsideCallout).toBe(true);
    expect(container.querySelector(".callout")?.textContent).toContain(
      "FY2025 revenue",
    );
  });
});
