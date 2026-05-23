import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreamHtml } from "../src/streamhtml";
import { INTERACTIVE_STATE_TRAP } from "./fixtures/claude-edge-cases";

describe("interactive state trap structure", () => {
  it("final render nests paragraph inside details with open attribute", () => {
    const { container } = render(
      <StreamHtml isStreaming={false}>{INTERACTIVE_STATE_TRAP}</StreamHtml>,
    );
    const details = container.querySelector("details");
    const p = container.querySelector("details p");
    expect(details?.hasAttribute("open")).toBe(true);
    expect(p).toBeTruthy();
    expect(p?.textContent).toContain("innerHTML");
  });

  it("mid-stream closeOpenTags splits details body outside (known limitation)", () => {
    const partial =
      '<div class="callout warn">Expand</div><details open><summary>Click me</summary><p>If the live';
    const { container, rerender } = render(
      <StreamHtml isStreaming={true}>{partial.slice(0, 40)}</StreamHtml>,
    );
    rerender(<StreamHtml isStreaming={true}>{partial}</StreamHtml>);
    const details = container.querySelector("details");
    const orphanP = container.querySelector(".sh-live > p");
    // auto-closed details ends before partial <p> finishes — paragraph escapes
    expect(details).toBeTruthy();
    expect(orphanP ?? container.querySelector("details p")).toBeTruthy();
  });
});
