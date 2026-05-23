/** HTML void elements — never need closing tags */
export const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** Tags whose contents should not be parsed for nested markup */
export const RAW_TEXT_TAGS = new Set([
  "pre",
  "code",
  "textarea",
  "script",
  "style",
]);

/** Block-level tags used for stable/live splitting at depth 0 */
export const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "dd",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "style",
  "table",
  "ul",
]);

export const TAG_PATTERN =
  /^<\/?([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(\/)?>/;

/** Incomplete tag at end: partial name OR lone opening bracket */
export const INCOMPLETE_TAG_PATTERN = /<(?:\/|[a-zA-Z])[^>]*$|<$/;
