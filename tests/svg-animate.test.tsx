import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { StreamHtml } from "../src/streamhtml";
import { sanitizeHtml } from "../src/sanitize";
import { streamChunks } from "./helpers/simulate-stream";

const SVG_ANIM = `<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="10" fill="#2563eb">
    <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/>
  </circle>
</svg>`;

const BLOCK_ONE = `<div>${SVG_ANIM}</div>`;
const BLOCK_TWO = `<div><svg viewBox="0 0 50 50"><rect width="50" height="50"><animate attributeName="width" values="50;40;50" dur="1s" repeatCount="indefinite"/></rect></svg></div>`;

describe("SVG SMIL animation tags", () => {
  it("preserves animate, animateTransform, and animateMotion", () => {
    const html = `<svg viewBox="0 0 100 100">
      <path d="M10,50 L90,50">
        <animate attributeName="d" values="M10,50 L90,50;M10,30 L90,70;M10,50 L90,50" dur="2s" repeatCount="indefinite"/>
      </path>
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="2s" repeatCount="indefinite"/>
      </g>
      <circle r="4" fill="red">
        <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite"/>
        <animateMotion dur="3s" repeatCount="indefinite" path="M10,50 L90,50"/>
      </circle>
    </svg>`;

    const clean = sanitizeHtml(html);
    expect(clean).toContain("<animate ");
    expect(clean).toContain('attributeName="d"');
    expect(clean).toContain("<animateTransform ");
    expect(clean).toContain("<animateMotion ");
    expect(clean).toContain('attributeName="opacity"');
  });

  it("StreamHtml keeps animate tags once SVG is complete during streaming", () => {
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{SVG_ANIM}</StreamHtml>,
    );
    expect(container.querySelector("animate")).toBeTruthy();
    expect(container.querySelector('[attributeName="r"]')).toBeTruthy();

    rerender(<StreamHtml isStreaming={false}>{SVG_ANIM}</StreamHtml>);
    expect(container.querySelector("animate")).toBeTruthy();
    expect(container.querySelector('[attributeName="r"]')).toBeTruthy();
  });

  it("strips animate tags while SVG is still streaming", () => {
    const partial = SVG_ANIM.slice(0, SVG_ANIM.indexOf("</svg>"));
    const { container } = render(
      <StreamHtml isStreaming={true}>{partial}</StreamHtml>,
    );
    expect(container.querySelector("animate")).toBeFalsy();
  });

  it("unlocks animations per svg as each completes during streaming", () => {
    const full = BLOCK_ONE + BLOCK_TWO;
    let html = "";
    let sawFirstSvgAnimateWhileStreaming = false;

    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{html}</StreamHtml>,
    );

    for (const chunk of streamChunks(full, 12)) {
      html = chunk;
      const stillStreaming = html.length < full.length;
      rerender(<StreamHtml isStreaming={true}>{html}</StreamHtml>);

      if (
        stillStreaming &&
        container.querySelector(".sh-live-frozen animate, .sh-live animate")
      ) {
        sawFirstSvgAnimateWhileStreaming = true;
      }
    }

    expect(sawFirstSvgAnimateWhileStreaming).toBe(true);
    expect(container.querySelectorAll(".sh-live animate")).toHaveLength(2);
  });

  it("keeps the same frozen SVG element across later streaming chunks", () => {
    const svg2 =
      '<svg viewBox="0 0 50 50"><rect width="50"><animate attributeName="width" values="50;40;50" dur="1s" repeatCount="indefinite"/></rect></svg>';
    const full = `<div>${SVG_ANIM}${svg2}</div>`;

    let html = "";
    let frozenSvg: Element | null = null;

    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{html}</StreamHtml>,
    );

    for (const chunk of streamChunks(full, 10)) {
      html = chunk;
      rerender(<StreamHtml isStreaming={true}>{html}</StreamHtml>);

      const nextFrozen = container.querySelector(".sh-live-frozen svg");
      if (!nextFrozen) {
        continue;
      }
      if (!frozenSvg) {
        frozenSvg = nextFrozen;
        continue;
      }
      expect(nextFrozen).toBe(frozenSvg);
    }

    expect(frozenSvg).toBeTruthy();
  });
});
