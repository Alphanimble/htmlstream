import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreamHtml } from "../src/streamhtml";
import { configureSanitizer } from "../src/sanitize";
import {
  DATA_TABLE,
  FULL_DASHBOARD,
  LATEX_HEAVY,
  METRICS_DASHBOARD,
  SVG_BAR_CHART,
  SVG_WITH_SCRIPT_INJECTION,
} from "./fixtures/visual-html";
import { streamChunks } from "./helpers/simulate-stream";

configureSanitizer({
  ADD_ATTR: ["target", "data-latex", "data-display"],
});

describe("StreamHtml integration — visual rendering", () => {
  it("renders metrics dashboard with bar fills", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{METRICS_DASHBOARD}</StreamHtml>,
    );
    expect(container.querySelectorAll(".metric")).toHaveLength(4);
    expect(container.querySelectorAll(".bar-fill")).toHaveLength(4);
    expect(container.querySelector(".metric-val")?.textContent).toBe("142ms");
  });

  it("renders SVG bar chart with rects and labels", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{SVG_BAR_CHART}</StreamHtml>,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("rect").length).toBeGreaterThanOrEqual(5);
    const labels = [...container.querySelectorAll("text")].map((t) => t.textContent);
    expect(labels).toContain("Q1");
    expect(labels).toContain("FY 2025");
  });

  it("renders data table with thead and tbody", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{DATA_TABLE}</StreamHtml>,
    );
    expect(container.querySelector("thead tr th")?.textContent).toBe("Region");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(4);
  });

  it("preserves data-latex attributes", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{LATEX_HEAVY}</StreamHtml>,
    );
    expect(container.querySelectorAll("[data-latex]").length).toBeGreaterThanOrEqual(3);
  });

  it("strips XSS from chart HTML while keeping svg", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{SVG_WITH_SCRIPT_INJECTION}</StreamHtml>,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("svg rect")).toBeTruthy();
  });

  it("streaming mode commits stable blocks as top-level elements close", () => {
    const partial = FULL_DASHBOARD.slice(0, 300);
    const { container } = render(
      <StreamHtml isStreaming={true}>{partial}</StreamHtml>,
    );
    expect(container.querySelector(".sh-live")).toBeTruthy();
    expect(container.querySelector(".metrics")).toBeTruthy();
  });

  it("survives full dashboard char-by-char stream without crashing", () => {
    for (const chunk of streamChunks(FULL_DASHBOARD, 7)) {
      const { unmount } = render(
        <StreamHtml isStreaming={true}>{chunk}</StreamHtml>,
      );
      unmount();
    }
  });

  it("completed stream splits into stable blocks", () => {
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{FULL_DASHBOARD.slice(0, 200)}</StreamHtml>,
    );
    expect(container.querySelector(".sh-live")).toBeTruthy();

    rerender(<StreamHtml isStreaming={false}>{FULL_DASHBOARD}</StreamHtml>);
    expect(container.querySelectorAll(".sh-stable").length).toBeGreaterThan(0);
    expect(container.querySelector(".metrics")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector("table")).toBeTruthy();
  });
});
