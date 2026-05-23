import { closeOpenTags } from "./rehtml";
import { sanitizeHtml } from "./sanitize";
import {
  applyStreamingSmilPolicy,
  finalizeSmilAnimations,
  stripSmilAnimations,
} from "./strip-smil-animations";

const SVG_OPEN_PATTERN = /^<svg\b[^>]*>/i;
const SVG_CLOSE_PATTERN = /^<\/svg\s*>/i;
const SVG_SELF_CLOSE_PATTERN = /^<svg\b[^>]*\/>/i;

export interface SvgRange {
  start: number;
  end: number;
}

function isSvgCompleteAt(html: string, svgOpenStart: number): boolean {
  const openMatch = html.slice(svgOpenStart).match(SVG_OPEN_PATTERN);
  if (!openMatch) {
    return false;
  }

  if (SVG_SELF_CLOSE_PATTERN.test(openMatch[0])) {
    return true;
  }

  let depth = 1;
  let i = svgOpenStart + openMatch[0].length;

  while (i < html.length && depth > 0) {
    if (html[i] === "<") {
      const slice = html.slice(i);
      const closeMatch = slice.match(SVG_CLOSE_PATTERN);
      if (closeMatch) {
        depth--;
        if (depth === 0) {
          return true;
        }
        i += closeMatch[0].length;
        continue;
      }

      const nestedSelfClose = slice.match(SVG_SELF_CLOSE_PATTERN);
      if (nestedSelfClose) {
        i += nestedSelfClose[0].length;
        continue;
      }

      const nestedOpen = slice.match(SVG_OPEN_PATTERN);
      if (nestedOpen) {
        depth++;
        i += nestedOpen[0].length;
        continue;
      }
    }
    i++;
  }

  return false;
}

function svgEndIndex(html: string, svgOpenStart: number): number {
  const openMatch = html.slice(svgOpenStart).match(SVG_OPEN_PATTERN);
  if (!openMatch) {
    return svgOpenStart;
  }

  if (SVG_SELF_CLOSE_PATTERN.test(openMatch[0])) {
    return svgOpenStart + openMatch[0].length;
  }

  let depth = 1;
  let i = svgOpenStart + openMatch[0].length;

  while (i < html.length && depth > 0) {
    if (html[i] === "<") {
      const slice = html.slice(i);
      const closeMatch = slice.match(SVG_CLOSE_PATTERN);
      if (closeMatch) {
        depth--;
        i += closeMatch[0].length;
        if (depth === 0) {
          return i;
        }
        continue;
      }

      const nestedSelfClose = slice.match(SVG_SELF_CLOSE_PATTERN);
      if (nestedSelfClose) {
        i += nestedSelfClose[0].length;
        continue;
      }

      const nestedOpen = slice.match(SVG_OPEN_PATTERN);
      if (nestedOpen) {
        depth++;
        i += nestedOpen[0].length;
        continue;
      }
    }
    i++;
  }

  return i;
}

/** Every fully closed `<svg>...</svg>` range in document order. */
export function getCompleteSvgRanges(html: string): SvgRange[] {
  if (!html || !/<svg\b/i.test(html)) {
    return [];
  }

  const ranges: SvgRange[] = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] === "<") {
      const slice = html.slice(i);
      const selfCloseMatch = slice.match(SVG_SELF_CLOSE_PATTERN);
      if (selfCloseMatch) {
        ranges.push({ start: i, end: i + selfCloseMatch[0].length });
        i += selfCloseMatch[0].length;
        continue;
      }

      const openMatch = slice.match(SVG_OPEN_PATTERN);
      if (openMatch && isSvgCompleteAt(html, i)) {
        ranges.push({ start: i, end: svgEndIndex(html, i) });
        i = ranges[ranges.length - 1]!.end;
        continue;
      }
    }
    i++;
  }

  return ranges;
}

/**
 * Track index through which streaming content is settled.
 * Completed SVGs (and markup before an in-progress SVG) stay frozen in the DOM.
 */
export function getStreamingFreezePoint(track: string): number {
  const ranges = getCompleteSvgRanges(track);
  if (ranges.length === 0) {
    return 0;
  }

  const lastComplete = ranges[ranges.length - 1]!;
  const tail = track.slice(lastComplete.end);

  if (/<svg\b/i.test(tail)) {
    return lastComplete.end;
  }

  return lastComplete.end;
}

export function trackHasSvg(html: string): boolean {
  return /<svg\b/i.test(html);
}

/** Render a track slice for one-time append into the frozen region. */
export function renderFrozenTrackSlice(slice: string, fullTrack: string): string {
  if (!slice) {
    return "";
  }

  const closed = closeOpenTags(slice);
  return sanitizeHtml(
    finalizeSmilAnimations(applyStreamingSmilPolicy(closed, fullTrack)),
  );
}

/** Render the mutable live tail (in-progress markup — SMIL stripped until frozen). */
export function renderStreamingTail(
  trackTail: string,
  _fullTrack: string,
): string {
  if (!trackTail) {
    return "";
  }

  const closed = closeOpenTags(trackTail);
  return sanitizeHtml(stripSmilAnimations(closed));
}
