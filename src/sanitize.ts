import DOMPurify from "isomorphic-dompurify";
import type { Config } from "dompurify";

const DEFAULT_CONFIG: Config = {
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ["target", "from", "to"],
  ADD_TAGS: ["style", "animate"],
  FORCE_BODY: true,
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
};

let globalConfig: Config = DEFAULT_CONFIG;

function mergeStringLists(
  ...lists: (string[] | undefined)[]
): string[] {
  return [...new Set(lists.flatMap((list) => list ?? []))];
}

/**
 * Configure default sanitization for all StreamHtml renders.
 */
export function configureSanitizer(config: Config): void {
  const baseAddAttr = Array.isArray(DEFAULT_CONFIG.ADD_ATTR)
    ? DEFAULT_CONFIG.ADD_ATTR
    : undefined;
  const extraAddAttr = Array.isArray(config.ADD_ATTR)
    ? config.ADD_ATTR
    : undefined;
  const baseAddTags = Array.isArray(DEFAULT_CONFIG.ADD_TAGS)
    ? DEFAULT_CONFIG.ADD_TAGS
    : undefined;
  const extraAddTags = Array.isArray(config.ADD_TAGS)
    ? config.ADD_TAGS
    : undefined;

  globalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    ADD_ATTR: mergeStringLists(baseAddAttr, extraAddAttr),
    ADD_TAGS: mergeStringLists(baseAddTags, extraAddTags),
  };
}

/**
 * Sanitize HTML for safe rendering. Uses DOMPurify with secure defaults.
 */
export function sanitizeHtml(
  html: string,
  config?: Config,
): string {
  if (!html) {
    return "";
  }

  return DOMPurify.sanitize(html, {
    ...globalConfig,
    ...config,
  });
}

export { DOMPurify };
