import { BLOCK_TAGS, TAG_PATTERN, VOID_TAGS } from "./constants";

export interface SplitBlocksResult {
  /** Fully closed top-level blocks — safe to memoize */
  stable: string[];
  /** Currently streaming fragment (may be incomplete) */
  live: string;
}

/**
 * Splits HTML into stable (completed) top-level blocks and a live tail.
 * Stable blocks never re-render once committed — critical for streaming perf.
 */
export function splitHtmlIntoBlocks(html: string): SplitBlocksResult {
  if (!html) {
    return { stable: [], live: "" };
  }

  const stable: string[] = [];
  let last = 0;
  let blockDepth = 0;
  let i = 0;

  while (i < html.length) {
    if (html[i] === "<") {
      const slice = html.slice(i);
      const tagMatch = slice.match(TAG_PATTERN);
      if (!tagMatch) {
        i++;
        continue;
      }

      const tagName = tagMatch[1]!.toLowerCase();
      const isClose = slice[1] === "/";
      const isSelfClose = Boolean(tagMatch[3]) || VOID_TAGS.has(tagName);

      if (BLOCK_TAGS.has(tagName)) {
        if (isClose) {
          blockDepth = Math.max(0, blockDepth - 1);
          if (blockDepth === 0) {
            const chunk = html.slice(last, i + tagMatch[0].length);
            if (chunk.trim()) {
              stable.push(chunk);
            }
            last = i + tagMatch[0].length;
          }
        } else if (!isSelfClose) {
          blockDepth++;
        }
      }

      i += tagMatch[0].length;
      continue;
    }

    i++;
  }

  return {
    stable,
    live: html.slice(last),
  };
}
