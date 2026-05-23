import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreamHtml } from "../src/streamhtml";
import {
  ATTRIBUTE_FRACTURE,
  BEZIER_SVG,
  CLAUDE_STREAM_SWEEP,
  DEEP_NESTING,
  GIANT_PRE,
  INTERACTIVE_STATE_TRAP,
  MALFORMED_SOUP,
  NESTED_TABLE_CALLOUT,
  ORDERED_COUNTERS,
  PERF_BOMB,
  SPANNING_TABLE,
  giantPreBlock,
  performanceBomb,
} from "./fixtures/claude-edge-cases";
import { streamChunks } from "./helpers/simulate-stream";

function streamWithoutCrash(html: string, chunkSize = 7): void {
  for (const chunk of streamChunks(html, chunkSize)) {
    const { unmount } = render(
      <StreamHtml isStreaming={true}>{chunk}</StreamHtml>,
    );
    unmount();
  }
}

describe("Claude edge cases — streaming stress", () => {
  it.each(Object.entries(CLAUDE_STREAM_SWEEP))(
    "survives cumulative stream: %s",
    (_id, html) => {
      expect(() => streamWithoutCrash(html, 5)).not.toThrow();
    },
  );

  it(
    "survives cumulative stream: PERF_BOMB",
    () => {
      expect(() => streamWithoutCrash(PERF_BOMB, 40)).not.toThrow();
    },
    60_000,
  );

  it(
    "survives cumulative stream: GIANT_PRE",
    () => {
      expect(() => streamWithoutCrash(GIANT_PRE, 40)).not.toThrow();
    },
    30_000,
  );

  it("renders final deep nesting text in the right place", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{DEEP_NESTING}</StreamHtml>,
    );
    expect(container.textContent).toContain("nested block tags");
    expect(container.querySelectorAll("ul").length).toBeGreaterThanOrEqual(3);
  });

  it("spanning table finishes with expected row count", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{SPANNING_TABLE}</StreamHtml>,
    );
    expect(container.querySelectorAll("table tr").length).toBeGreaterThanOrEqual(6);
    expect(container.textContent).toContain("$5.51M");
  });

  it("bezier SVG renders path and circle when complete", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{BEZIER_SVG}</StreamHtml>,
    );
    expect(container.querySelector("path")).toBeTruthy();
    expect(container.querySelector("circle")).toBeTruthy();
  });

  it("interactive elements survive char-by-char stream to completion", () => {
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{INTERACTIVE_STATE_TRAP.slice(0, 1)}</StreamHtml>,
    );

    for (let i = 8; i <= INTERACTIVE_STATE_TRAP.length; i += 8) {
      rerender(
        <StreamHtml isStreaming={true}>
          {INTERACTIVE_STATE_TRAP.slice(0, i)}
        </StreamHtml>,
      );
    }
    rerender(
      <StreamHtml isStreaming={false}>{INTERACTIVE_STATE_TRAP}</StreamHtml>,
    );

    expect(container.querySelector("details")).toBeTruthy();
    expect(container.querySelector("input")).toBeTruthy();
    expect(container.querySelector("textarea")).toBeTruthy();
  });

  it("attribute fracture stream does not leave orphan text at container root", () => {
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{ATTRIBUTE_FRACTURE.slice(0, 1)}</StreamHtml>,
    );

    let sawCleanParagraph = false;
    for (let i = 6; i <= ATTRIBUTE_FRACTURE.length; i += 6) {
      rerender(
        <StreamHtml isStreaming={true}>
          {ATTRIBUTE_FRACTURE.slice(0, i)}
        </StreamHtml>,
      );
      const live = container.querySelector(".sh-live");
      const orphanText =
        live &&
        [...live.childNodes].some(
          (n) =>
            n.nodeType === Node.TEXT_NODE &&
            (n.textContent?.trim()?.length ?? 0) > 0,
        );
      const paragraph = live?.querySelector("p");
      if (paragraph && (paragraph.textContent?.length ?? 0) > 20 && !orphanText) {
        sawCleanParagraph = true;
      }
    }

    expect(sawCleanParagraph).toBe(true);
  });

  it("ordered list keeps all items in one ol after stream", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{ORDERED_COUNTERS}</StreamHtml>,
    );
    expect(container.querySelectorAll("ol.counter-list li").length).toBe(6);
  });

  it("nested table + callout streams footer text inside callout", () => {
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>
        {NESTED_TABLE_CALLOUT.slice(0, 1)}
      </StreamHtml>,
    );

    for (let i = 10; i <= NESTED_TABLE_CALLOUT.length; i += 10) {
      rerender(
        <StreamHtml isStreaming={true}>
          {NESTED_TABLE_CALLOUT.slice(0, i)}
        </StreamHtml>,
      );
    }
    rerender(
      <StreamHtml isStreaming={false}>{NESTED_TABLE_CALLOUT}</StreamHtml>,
    );

    expect(container.textContent).toContain("Footer callout");
    const callouts = container.querySelectorAll(".callout");
    expect(callouts.length).toBeGreaterThanOrEqual(2);
  });

  it("malformed soup completes without empty live block crash", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{MALFORMED_SOUP}</StreamHtml>,
    );
    expect(container.querySelector(".sh-root")).toBeTruthy();
    expect(container.textContent).toContain("Adversarial");
  });

  it("giant pre block streams and preserves end marker", () => {
    const html = giantPreBlock(4000);
    streamWithoutCrash(html, 11);
    const { container } = render(
      <StreamHtml isStreaming={false}>{html}</StreamHtml>,
    );
    expect(container.querySelector("pre.code-block")?.textContent?.length).toBe(
      4000,
    );
    expect(container.textContent).toContain("End marker");
  });

  it("performance bomb renders all metric cards", () => {
    const html = performanceBomb(60);
    streamWithoutCrash(html, 20);
    const { container } = render(
      <StreamHtml isStreaming={false}>{html}</StreamHtml>,
    );
    expect(container.querySelectorAll(".metric").length).toBe(60);
  });

  it("concurrent streams stay isolated", () => {
    const { container: a } = render(
      <StreamHtml isStreaming={true}>{SPANNING_TABLE}</StreamHtml>,
    );
    const { container: b } = render(
      <StreamHtml isStreaming={true}>{BEZIER_SVG}</StreamHtml>,
    );
    const { container: c } = render(
      <StreamHtml isStreaming={true}>{DEEP_NESTING}</StreamHtml>,
    );

    expect(a.querySelector("table")).toBeTruthy();
    expect(b.querySelector("svg")).toBeTruthy();
    expect(c.querySelector(".outer")).toBeTruthy();
    expect(a.querySelector("svg")).toBeNull();
    expect(b.querySelector("table")).toBeNull();
  });

  it(
    "perf bomb + giant pre at chunk size 1 does not throw",
    () => {
      expect(() => streamWithoutCrash(PERF_BOMB.slice(0, 2000), 1)).not.toThrow();
      expect(() => streamWithoutCrash(GIANT_PRE.slice(0, 1500), 1)).not.toThrow();
    },
    30_000,
  );
});
