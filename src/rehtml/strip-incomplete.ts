import {
  INCOMPLETE_TAG_PATTERN,
  RAW_TEXT_TAGS,
  TAG_PATTERN,
} from "./constants";

/**
 * Returns the index of an incomplete HTML tag at the end of the string, or -1.
 * Respects raw-text contexts (pre, code, etc.) where `<` is literal.
 */
export function findIncompleteTagIndex(html: string): number {
  const match = html.match(INCOMPLETE_TAG_PATTERN);
  if (!match || match.index === undefined) {
    return -1;
  }

  if (isInsideRawText(html, match.index)) {
    return -1;
  }

  return match.index;
}

/**
 * Strips a trailing incomplete tag (e.g. `<div class="fo`) from streaming HTML.
 */
export function stripIncompleteTag(html: string): string {
  const index = findIncompleteTagIndex(html);
  if (index === -1) {
    return html;
  }
  return html.slice(0, index).trimEnd();
}

function isInsideRawText(html: string, position: number): boolean {
  let i = 0;
  const rawStack: string[] = [];

  while (i < position) {
    if (html[i] === "<") {
      if (rawStack.length > 0) {
        const rawTag = rawStack[rawStack.length - 1]!;
        const close = `</${rawTag}>`;
        if (html.slice(i, i + close.length).toLowerCase() === close) {
          rawStack.pop();
          i += close.length;
          continue;
        }
        i++;
        continue;
      }

      const slice = html.slice(i);
      const tagMatch = slice.match(TAG_PATTERN);
      if (tagMatch) {
        const tagName = tagMatch[1]!.toLowerCase();
        const isClose = slice[1] === "/";

        if (!isClose && RAW_TEXT_TAGS.has(tagName)) {
          rawStack.push(tagName);
        }

        i += tagMatch[0].length;
        continue;
      }
    }
    i++;
  }

  return rawStack.length > 0;
}

export { isInsideRawText };
