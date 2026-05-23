/** SMIL tags that restart whenever their parent SVG is re-parsed during streaming. */
const SMIL_ANIMATION_PATTERN =
  /<\s*(animate(?:Transform|Motion)?|set)\b[^>]*\/\s*>|<\s*(animate(?:Transform|Motion)?|set)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi;

const SVG_OPEN_PATTERN = /^<svg\b[^>]*>/i;
const SVG_CLOSE_PATTERN = /^<\/svg\s*>/i;
const SVG_SELF_CLOSE_PATTERN = /^<svg\b[^>]*\/>/i;

/**
 * Remove SVG SMIL animation tags from HTML.
 * Used during streaming so innerHTML/patch updates do not restart animations every chunk.
 */
export function stripSmilAnimations(html: string): string {
  if (!html || !/<\s*animate/i.test(html)) {
    return html;
  }
  return html.replace(SMIL_ANIMATION_PATTERN, "");
}

const SMIL_OPEN_TAG =
  /<\s*(animate(?:Transform|Motion)?|set)\b([^>]*?)(\s*\/)?>/gi;

/**
 * When an SVG is complete, run SMIL once and hold the final frame.
 * Prevents indefinite loops and makes restarts less noticeable if DOM is rebuilt.
 */
export function finalizeSmilAnimations(html: string): string {
  if (!html || !/<\s*animate/i.test(html)) {
    return html;
  }

  return html.replace(SMIL_OPEN_TAG, (match, tag, attrs, selfClose) => {
    let nextAttrs = String(attrs ?? "");

    if (/repeatCount\s*=/.test(nextAttrs)) {
      nextAttrs = nextAttrs.replace(
        /repeatCount\s*=\s*(["'])[^"']*\1/i,
        'repeatCount="1"',
      );
    } else {
      nextAttrs += ' repeatCount="1"';
    }

    if (!/fill\s*=/.test(nextAttrs)) {
      nextAttrs += ' fill="freeze"';
    }

    const suffix = selfClose ? " />" : ">";
    return `<${tag}${nextAttrs}${suffix}`;
  });
}

function findEnclosingSvgStart(html: string, index: number): number {
  const stack: number[] = [];
  let i = 0;

  while (i < index) {
    if (html[i] === "<") {
      const slice = html.slice(i);
      const closeMatch = slice.match(SVG_CLOSE_PATTERN);
      if (closeMatch) {
        stack.pop();
        i += closeMatch[0].length;
        continue;
      }

      const selfCloseMatch = slice.match(SVG_SELF_CLOSE_PATTERN);
      if (selfCloseMatch) {
        i += selfCloseMatch[0].length;
        continue;
      }

      const openMatch = slice.match(SVG_OPEN_PATTERN);
      if (openMatch) {
        stack.push(i);
        i += openMatch[0].length;
        continue;
      }
    }
    i++;
  }

  return stack.length > 0 ? stack[stack.length - 1]! : -1;
}

function countSvgOpensBefore(html: string, beforeIndex: number): number {
  let count = 0;
  let i = 0;

  while (i < beforeIndex) {
    if (html[i] === "<") {
      const slice = html.slice(i);
      const closeMatch = slice.match(SVG_CLOSE_PATTERN);
      if (closeMatch) {
        i += closeMatch[0].length;
        continue;
      }

      const selfCloseMatch = slice.match(SVG_SELF_CLOSE_PATTERN);
      if (selfCloseMatch) {
        i += selfCloseMatch[0].length;
        continue;
      }

      const openMatch = slice.match(SVG_OPEN_PATTERN);
      if (openMatch) {
        count++;
        i += openMatch[0].length;
        continue;
      }
    }
    i++;
  }

  return count;
}

function findNthSvgOpen(track: string, n: number): number {
  let count = 0;
  let i = 0;

  while (i < track.length) {
    if (track[i] === "<") {
      const slice = track.slice(i);
      const selfCloseMatch = slice.match(SVG_SELF_CLOSE_PATTERN);
      if (selfCloseMatch) {
        if (count === n) {
          return i;
        }
        count++;
        i += selfCloseMatch[0].length;
        continue;
      }

      const openMatch = slice.match(SVG_OPEN_PATTERN);
      if (openMatch) {
        if (count === n) {
          return i;
        }
        count++;
        i += openMatch[0].length;
        continue;
      }
    }
    i++;
  }

  return -1;
}

function isSvgCompleteInTrack(track: string, svgOpenStart: number): boolean {
  const openMatch = track.slice(svgOpenStart).match(SVG_OPEN_PATTERN);
  if (!openMatch) {
    return false;
  }

  if (SVG_SELF_CLOSE_PATTERN.test(openMatch[0])) {
    return true;
  }

  let depth = 1;
  let i = svgOpenStart + openMatch[0].length;

  while (i < track.length && depth > 0) {
    if (track[i] === "<") {
      const slice = track.slice(i);
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

function findCorrespondingSvgInTrack(
  track: string,
  html: string,
  svgStartInHtml: number,
): number {
  const svgIndex = countSvgOpensBefore(html, svgStartInHtml);
  return findNthSvgOpen(track, svgIndex);
}

/**
 * Selectively strip SMIL tags from streaming HTML.
 * Keeps animations for SVGs that are fully present in the raw track; strips the rest.
 */
export function applyStreamingSmilPolicy(html: string, track: string): string {
  if (!html || !/<\s*animate/i.test(html)) {
    return html;
  }

  if (!track) {
    return stripSmilAnimations(html);
  }

  const matches: Array<{ start: number; end: number }> = [];
  const pattern = new RegExp(SMIL_ANIMATION_PATTERN.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  if (matches.length === 0) {
    return html;
  }

  let result = html;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end } = matches[i]!;
    const svgStart = findEnclosingSvgStart(html, start);
    const shouldStrip =
      svgStart === -1 ||
      (() => {
        const trackSvgStart = findCorrespondingSvgInTrack(track, html, svgStart);
        return (
          trackSvgStart === -1 ||
          !isSvgCompleteInTrack(track, trackSvgStart)
        );
      })();

    if (shouldStrip) {
      result = result.slice(0, start) + result.slice(end);
    }
  }

  return finalizeSmilAnimations(result);
}
