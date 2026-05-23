import type { Config } from "dompurify";
import { closeOpenTags } from "./close-tags";
import { splitHtmlIntoBlocks } from "./split-blocks";
import { stripIncompleteTag } from "./strip-incomplete";

export type { SplitBlocksResult } from "./split-blocks";
export { closeOpenTags } from "./close-tags";
export { splitHtmlIntoBlocks } from "./split-blocks";
export {
  findIncompleteTagIndex,
  isInsideRawText,
  stripIncompleteTag,
} from "./strip-incomplete";
export { BLOCK_TAGS, RAW_TEXT_TAGS, VOID_TAGS } from "./constants";

export interface RehtmlOptions {
  /** Strip trailing incomplete tags (default: true) */
  stripIncomplete?: boolean;
  /** Auto-close unclosed tags for rendering (default: true) */
  closeTags?: boolean;
  /** Split into stable/live blocks (default: true) */
  splitBlocks?: boolean;
}

export interface RehtmlResult {
  /** HTML ready for rendering (repaired, not yet sanitized) */
  html: string;
  /** Stable top-level blocks for memoized rendering */
  stable: string[];
  /** Live streaming tail */
  live: string;
  /** Whether the input had a trailing incomplete tag */
  hadIncompleteTag: boolean;
}

const defaultOptions: Required<RehtmlOptions> = {
  stripIncomplete: true,
  closeTags: true,
  splitBlocks: true,
};

/**
 * Repair streaming HTML for safe partial rendering.
 *
 * Pipeline:
 * 1. Strip trailing incomplete tags (`<div class="fo`)
 * 2. Auto-close open tags (`<strong>bold` → `<strong>bold</strong>`)
 * 3. Split into stable blocks + live tail for incremental rendering
 */
export function rehtml(
  input: string,
  options?: RehtmlOptions,
): RehtmlResult {
  const opts = { ...defaultOptions, ...options };

  if (!input || typeof input !== "string") {
    return {
      html: "",
      stable: [],
      live: "",
      hadIncompleteTag: false,
    };
  }

  let html = input;
  let hadIncompleteTag = false;

  if (opts.stripIncomplete) {
    const stripped = stripIncompleteTag(html);
    hadIncompleteTag = stripped.length !== html.length;
    html = stripped;
  }

  // Split before auto-closing — only genuinely closed blocks become stable
  const { stable, live } = opts.splitBlocks
    ? splitHtmlIntoBlocks(html)
    : { stable: [] as string[], live: html };

  const close = (chunk: string) =>
    opts.closeTags ? closeOpenTags(chunk) : chunk;

  return {
    html: close(html),
    stable: stable.map(close),
    live: close(live),
    hadIncompleteTag,
  };
}

/** Re-export DOMPurify config type for convenience */
export type SanitizeConfig = Config;
