import { RAW_TEXT_TAGS, TAG_PATTERN, VOID_TAGS } from "./constants";

/**
 * Appends closing tags for any unclosed elements so partial HTML renders safely.
 * Tolerates mismatched closing tags (common in LLM output).
 */
export function closeOpenTags(html: string): string {
  const stack: string[] = [];
  const rawStack: string[] = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] === "<") {
      if (rawStack.length > 0) {
        const rawTag = rawStack[rawStack.length - 1]!;
        const close = `</${rawTag}>`;
        if (html.slice(i, i + close.length).toLowerCase() === close) {
          rawStack.pop();
          popUntil(stack, rawTag);
          i += close.length;
          continue;
        }
        i++;
        continue;
      }

      const slice = html.slice(i);
      const tagMatch = slice.match(TAG_PATTERN);
      if (!tagMatch) {
        i++;
        continue;
      }

      const full = tagMatch[0];
      const tagName = tagMatch[1]!.toLowerCase();
      const isClose = slice[1] === "/";
      const isSelfClose = Boolean(tagMatch[3]) || VOID_TAGS.has(tagName);

      if (isClose) {
        popUntil(stack, tagName);
        if (RAW_TEXT_TAGS.has(tagName)) {
          const rawIdx = rawStack.lastIndexOf(tagName);
          if (rawIdx !== -1) {
            rawStack.splice(rawIdx);
          }
        }
      } else if (isSelfClose) {
        // void / self-closing — nothing to push
      } else if (RAW_TEXT_TAGS.has(tagName)) {
        rawStack.push(tagName);
        stack.push(tagName);
      } else {
        stack.push(tagName);
      }

      i += full.length;
      continue;
    }

    i++;
  }

  if (stack.length === 0) {
    return html;
  }

  const closers = [...stack]
    .reverse()
    .map((tag) => `</${tag}>`)
    .join("");

  return html + closers;
}

function popUntil(stack: string[], tagName: string): void {
  if (stack.length === 0) {
    return;
  }

  const index = stack.lastIndexOf(tagName);
  if (index === -1) {
    return;
  }

  stack.splice(index);
}
