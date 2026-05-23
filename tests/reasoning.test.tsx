import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseStreamPartLine, parseStreamPartsText, readStreamParts, splitStoredStreamText } from "../src/stream-parts";
import { StreamHtml } from "../src/streamhtml";

describe("StreamHtml reasoning", () => {
  it("renders a thinking block when reasoning is provided", () => {
    const { container } = render(
      <StreamHtml reasoning="Let me think step by step…">
        {"<div>Answer</div>"}
      </StreamHtml>,
    );

    expect(container.querySelector(".sh-thinking")).toBeTruthy();
    expect(container.querySelector(".sh-thinking-body")?.textContent).toBe(
      "Let me think step by step…",
    );
    expect(container.querySelector(".sh-root")?.textContent).toContain("Answer");
  });

  it("shows pending label while streaming reasoning before HTML arrives", () => {
    const { container } = render(
      <StreamHtml isStreaming reasoning="Still thinking">
        {""}
      </StreamHtml>,
    );

    expect(container.querySelector(".sh-reasoning-pending")?.textContent).toBe(
      "Composing reply…",
    );
    expect(container.querySelector(".sh-thinking")?.hasAttribute("open")).toBe(
      true,
    );
  });

  it("repairs corrupted NDJSON stream text passed as children", () => {
    const corrupted =
      '{"kind":"reasoning","delta":"plan"}{"kind":"content","delta":"<p>Hi</p>"}';
    const { container } = render(
      <StreamHtml isStreaming={false}>{corrupted}</StreamHtml>,
    );

    expect(container.querySelector(".sh-thinking-body")?.textContent).toBe(
      "plan",
    );
    expect(container.querySelector(".sh-root")?.textContent).toContain("Hi");
    expect(container.textContent).not.toContain('"kind":"reasoning"');
  });
});

describe("stream parts", () => {
  it("parses reasoning and content NDJSON lines", () => {
    expect(
      parseStreamPartLine('{"kind":"reasoning","delta":"think"}'),
    ).toEqual({ kind: "reasoning", delta: "think" });
    expect(
      parseStreamPartLine('{"kind":"content","delta":"<p>hi</p>"}'),
    ).toEqual({ kind: "content", delta: "<p>hi</p>" });
    expect(parseStreamPartLine("not json")).toBeNull();
  });

  it("reads NDJSON parts from a stream", async () => {
    const payload =
      '{"kind":"reasoning","delta":"a"}\n{"kind":"content","delta":"html"}\n';
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload.slice(0, 24)));
        controller.enqueue(new TextEncoder().encode(payload.slice(24)));
        controller.close();
      },
    });

    const parts: string[] = [];
    await readStreamParts(body, (part) => {
      parts.push(`${part.kind}:${part.delta}`);
    });

    expect(parts).toEqual(["reasoning:a", "content:html"]);
  });

  it("parses glued NDJSON objects without newlines", () => {
    const text =
      '{"kind":"reasoning","delta":"a"}{"kind":"content","delta":"<p>x</p>"}';
    expect(parseStreamPartsText(text).parts).toEqual([
      { kind: "reasoning", delta: "a" },
      { kind: "content", delta: "<p>x</p>" },
    ]);
    expect(splitStoredStreamText(text)).toEqual({
      reasoning: "a",
      content: "<p>x</p>",
    });
  });
});
