import { describe, expect, it } from "vitest";
import {
  getCompleteSvgRanges,
  getStreamingFreezePoint,
  renderFrozenTrackSlice,
} from "../src/freeze-stream-svgs";

const SVG1 =
  '<svg viewBox="0 0 10 10"><circle r="5"><animate attributeName="r" dur="2s"/></circle></svg>';
const SVG2 =
  '<svg viewBox="0 0 10 10"><rect width="10"><animate attributeName="width" dur="1s"/></rect></svg>';

describe("getCompleteSvgRanges", () => {
  it("finds one complete svg", () => {
    const ranges = getCompleteSvgRanges(SVG1);
    expect(ranges).toHaveLength(1);
    expect(SVG1.slice(ranges[0]!.start, ranges[0]!.end)).toBe(SVG1);
  });

  it("finds multiple complete svgs", () => {
    const track = `<div>${SVG1}<p>x</p>${SVG2}</div>`;
    const ranges = getCompleteSvgRanges(track);
    expect(ranges).toHaveLength(2);
  });

  it("ignores incomplete trailing svg", () => {
    const partial = SVG1.slice(0, SVG1.indexOf("</circle>"));
    const ranges = getCompleteSvgRanges(partial);
    expect(ranges).toHaveLength(0);
  });
});

describe("getStreamingFreezePoint", () => {
  it("returns 0 while first svg is incomplete", () => {
    const partial = SVG1.slice(0, SVG1.indexOf("</svg>"));
    expect(getStreamingFreezePoint(partial)).toBe(0);
  });

  it("freezes through first svg when second is streaming", () => {
    const track = `${SVG1}${SVG2.slice(0, 20)}`;
    const freeze = getStreamingFreezePoint(track);
    expect(freeze).toBe(SVG1.length);
  });
});

describe("renderFrozenTrackSlice", () => {
  it("keeps SMIL on complete svg slices", () => {
    const track = `${SVG1}${SVG2.slice(0, 10)}`;
    const slice = track.slice(0, SVG1.length);
    const rendered = renderFrozenTrackSlice(slice, track);
    expect(rendered).toContain("<animate");
  });
});
