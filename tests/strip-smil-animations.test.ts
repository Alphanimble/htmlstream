import { describe, expect, it } from "vitest";
import {
  applyStreamingSmilPolicy,
  stripSmilAnimations,
} from "../src/strip-smil-animations";

describe("stripSmilAnimations", () => {
  it("removes self-closing SMIL tags", () => {
    const html =
      '<svg><path d="M0,0"><animate attributeName="d" dur="2s" repeatCount="indefinite"/></path></svg>';
    const stripped = stripSmilAnimations(html);
    expect(stripped).not.toContain("<animate");
    expect(stripped).toContain("<path");
  });

  it("removes animateTransform and animateMotion", () => {
    const html = `<svg>
      <g><animateTransform attributeName="transform" type="rotate" dur="2s" repeatCount="indefinite"/></g>
      <circle r="4"><animateMotion dur="3s" path="M0,0 L10,0"/></circle>
    </svg>`;
    const stripped = stripSmilAnimations(html);
    expect(stripped).not.toContain("animateTransform");
    expect(stripped).not.toContain("animateMotion");
    expect(stripped).toContain("<circle");
  });

  it("leaves html unchanged when no SMIL tags exist", () => {
    const html = "<svg><circle r=\"5\"/></svg>";
    expect(stripSmilAnimations(html)).toBe(html);
  });
});

describe("applyStreamingSmilPolicy", () => {
  const completeSvg = `<svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="10">
      <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>`;

  it("keeps animations when the enclosing SVG is complete in the track", () => {
    const result = applyStreamingSmilPolicy(completeSvg, completeSvg);
    expect(result).toContain("<animate");
    expect(result).toContain('attributeName="r"');
  });

  it("strips animations when the enclosing SVG is incomplete in the track", () => {
    const incompleteTrack = `<svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="10">
      <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/>
    </circle>`;
    const display = completeSvg;
    const result = applyStreamingSmilPolicy(display, incompleteTrack);
    expect(result).not.toContain("<animate");
    expect(result).toContain("<circle");
  });

  it("handles multiple SVGs independently", () => {
    const firstSvg = `<svg><circle r="5"><animate attributeName="r" dur="1s"/></circle></svg>`;
    const secondSvg = `<svg><circle r="8"><animate attributeName="r" dur="2s"/></circle>`;
    const track = firstSvg + secondSvg;
    const display = firstSvg + secondSvg + "</svg>";
    const result = applyStreamingSmilPolicy(display, track);
    expect(result).toContain('<svg><circle r="5"><animate');
    expect(result).not.toContain('r="8"><animate');
    expect(result).toContain('<circle r="8">');
  });

  it("strips all animations when track is empty", () => {
    const result = applyStreamingSmilPolicy(completeSvg, "");
    expect(result).not.toContain("<animate");
  });

  it("finalizes kept animations to play once and freeze", () => {
    const result = applyStreamingSmilPolicy(completeSvg, completeSvg);
    expect(result).toContain('repeatCount="1"');
    expect(result).toContain('fill="freeze"');
  });
});
