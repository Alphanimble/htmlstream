import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { StreamHtml } from "../src/streamhtml";

const TESLA_CSS = `#tesla-visual-guide h1 {
  background: linear-gradient(90deg, #00f3ff, #b026ff);
  -webkit-background-clip: text;
  animation: tesla-flicker 4s infinite;
}
.t-node::before { content: ''; position: absolute; }
@keyframes tesla-flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }`;

const STYLE_SNIPPET = `<style>${TESLA_CSS}</style>
<div id="tesla-visual-guide">
  <h1>NIKOLA TESLA</h1>
  <div class="tesla-orb"></div>
</div>`;

describe("style tag rendering", () => {
  it("sanitize preserves style tag and CSS rules", async () => {
    const { sanitizeHtml } = await import("../src/sanitize");
    const clean = sanitizeHtml(STYLE_SNIPPET);
    expect(clean).toContain("<style");
    expect(clean).toContain("#tesla-visual-guide");
    expect(clean).toContain("@keyframes tesla-flicker");
    expect(clean).toContain("-webkit-background-clip");
    expect(clean).toContain("grid-template-columns");
  });

  it("StreamHtml renders style block in DOM", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{STYLE_SNIPPET}</StreamHtml>,
    );
    expect(container.querySelector("style")).toBeTruthy();
    expect(container.querySelector("#tesla-visual-guide")).toBeTruthy();
  });
});
