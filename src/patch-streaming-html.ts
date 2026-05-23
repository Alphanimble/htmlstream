import { closeOpenTags } from "./rehtml";
import { sanitizeHtml } from "./sanitize";
import { appendStreamingTextChunk } from "./stream-chunk";
import {
  acquireStreamingCaret,
  positionStreamingCaretAtRange,
  setStreamingCaretVisible,
} from "./stream-caret";

const CARET_RE =
  /<span\s+class="sh-caret"[^>]*>\s*<\/span>\s*$/i;

/** Sanitize before every incremental DOM write during streaming */
function insertSafeHtml(
  parent: Element,
  position: InsertPosition,
  html: string,
): void {
  parent.insertAdjacentHTML(position, sanitizePatchFragment(html));
}

/** DOMPurify strips bare tr/td — wrap in table context first */
function sanitizePatchFragment(html: string): string {
  if (!html || !/<\/?t[dhbr]/i.test(html)) {
    return sanitizeHtml(html);
  }

  const section = /<th\b/i.test(html) ? "thead" : "tbody";
  const wrapped = `<table><${section}>${html}</${section}></table>`;
  const clean = sanitizeHtml(wrapped);
  const re = new RegExp(
    `<table><${section}>([\\s\\S]*)</${section}></table>`,
    "i",
  );
  const match = clean.match(re);
  return match?.[1]?.trim() ? match[1]! : sanitizeHtml(html);
}
const TR_RE = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
const CELL_RE = /<t[hd]\b/i;

const VOID_TAGS = new Set([
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

/** Tags where streamed text characters should show the caret. */
const TEXT_STREAM_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "code",
  "dd",
  "del",
  "div",
  "dt",
  "em",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "ins",
  "label",
  "li",
  "mark",
  "p",
  "pre",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "td",
  "th",
]);

/** Literal characters currently being typed at the end of the track. */
function getTrailingTextRun(track: string): string {
  const lastGt = track.lastIndexOf(">");
  if (lastGt === -1) {
    if (/<[a-z!/]/i.test(track)) {
      return "";
    }
    return track.trim();
  }

  const tail = track.slice(lastGt + 1);
  if (!tail.trim() || /<[a-z!/]/i.test(tail)) {
    return "";
  }
  return tail.trim();
}

/** Unclosed element tags at end of strip-only track */
function getOpenTagStack(html: string): string[] {
  const openTags: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*(\/)?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[1]!.toLowerCase();
    const isClose = match[0]![1] === "/";
    const isSelfClose =
      Boolean(match[2]) || match[0]!.endsWith("/>") || VOID_TAGS.has(tag);

    if (isClose) {
      const idx = openTags.lastIndexOf(tag);
      if (idx !== -1) {
        openTags.splice(idx);
      }
    } else if (!isSelfClose) {
      openTags.push(tag);
    }
  }

  return openTags;
}

/** Show the caret only while literal text is streaming into a text-bearing element. */
export function shouldShowStreamingCaret(cleanTrack: string): boolean {
  const track = cleanTrack.trim();
  const tailText = getTrailingTextRun(track);
  if (!tailText) {
    return false;
  }

  const stack = getOpenTagStack(track);
  if (stack.length === 0) {
    return true;
  }

  const deepest = stack[stack.length - 1]!.toLowerCase();
  return TEXT_STREAM_TAGS.has(deepest);
}

/** Walk DOM to the innermost open element matching the track stack */
function findDeepOpenElement(
  container: HTMLElement,
  stack: string[],
): HTMLElement | null {
  let node: Element = container;

  for (const tag of stack) {
    const tagLower = tag.toLowerCase();
    let matched: Element | null = null;

    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i]!;
      if (child.tagName.toLowerCase() === tagLower) {
        matched = child;
        break;
      }
    }

    if (!matched) {
      return null;
    }
    node = matched;
  }

  return node as HTMLElement;
}

/** Deepest last text node under `root` (matches insertAdjacentText tail). */
function findLastTextNode(root: Node): Text | null {
  if (root.nodeType === Node.TEXT_NODE) {
    const text = root as Text;
    return text.data.length > 0 ? text : null;
  }

  for (let i = root.childNodes.length - 1; i >= 0; i--) {
    const found = findLastTextNode(root.childNodes[i]!);
    if (found) {
      return found;
    }
  }
  return null;
}

function collapseRangeAtTextEnd(range: Range, text: Text): void {
  range.setStart(text, text.data.length);
  range.collapse(true);
}

function collapseRangeAtElementStart(range: Range, element: Element): void {
  range.selectNodeContents(element);
  range.collapse(true);
}

/** Caret range at the live stream insertion point — end of text, not after closed blocks. */
export function resolveStreamCaretRange(
  container: HTMLElement,
  cleanTrack: string,
): { range: Range; fallback: Element } {
  const range = document.createRange();

  const tableStart = findTableStart(cleanTrack);
  if (tableStart !== -1) {
    const table = container.querySelector("table");
    if (table) {
      const tableEnd = firstCompleteTableEnd(cleanTrack, tableStart);
      if (tableEnd === -1 || cleanTrack.length <= tableEnd) {
        const partialRow = table.querySelector("tr[data-sh-partial]");
        const tailRoot = partialRow ?? table;
        const text = findLastTextNode(tailRoot);
        if (text) {
          collapseRangeAtTextEnd(range, text);
          return { range, fallback: tailRoot as Element };
        }
        collapseRangeAtElementStart(range, tailRoot as Element);
        return { range, fallback: tailRoot as Element };
      }
    }
  }

  const stack = getOpenTagStack(cleanTrack);
  const target =
    stack.length > 0 ? findDeepOpenElement(container, stack) : container;

  if (!target) {
    const text = findLastTextNode(container);
    if (text) {
      collapseRangeAtTextEnd(range, text);
      return { range, fallback: container };
    }
    collapseRangeAtElementStart(range, container);
    return { range, fallback: container };
  }

  const text = findLastTextNode(target);
  if (text) {
    collapseRangeAtTextEnd(range, text);
    return { range, fallback: target };
  }

  collapseRangeAtElementStart(range, target);
  return { range, fallback: target };
}

/** Remove text nodes wrongly appended at container root during earlier frames */
function removeOrphanContainerText(container: HTMLElement): void {
  for (const node of [...container.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.remove();
    }
  }
}

/** Strip streaming caret marker from HTML */
export function stripCaret(html: string): string {
  return html.replace(CARET_RE, "").trimEnd();
}

function extractAllCompleteRows(html: string): string[] {
  const rows: string[] = [];
  const re = new RegExp(TR_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    rows.push(match[0]!);
  }
  return rows;
}

/** Extract complete rows that contain at least one cell (skip auto-closed empty rows) */
export function extractCompleteRows(html: string): string[] {
  return extractAllCompleteRows(html).filter((row) => CELL_RE.test(row));
}

/** Index where the first <table starts, or -1 */
export function findTableStart(html: string): number {
  return html.search(/<table\b/i);
}

/** Character index in `track` immediately after the first balanced </table>, or -1. */
export function firstCompleteTableEnd(
  track: string,
  tableStart: number,
): number {
  if (tableStart < 0 || tableStart >= track.length) {
    return -1;
  }

  const openMatch = track.slice(tableStart).match(/^<table\b[^>]*>/i);
  if (!openMatch) {
    return -1;
  }

  let depth = 1;
  let i = tableStart + openMatch[0]!.length;

  while (i < track.length && depth > 0) {
    if (track[i] === "<") {
      const rest = track.slice(i);
      const closeMatch = rest.match(/^<\/table\s*>/i);
      if (closeMatch) {
        depth--;
        i += closeMatch[0]!.length;
        if (depth === 0) {
          return i;
        }
        continue;
      }

      const nestedOpen = rest.match(/^<table\b[^>]*>/i);
      if (nestedOpen) {
        depth++;
        i += nestedOpen[0]!.length;
        continue;
      }
    }
    i++;
  }

  return -1;
}

function assembleTableSectionHtml(tableSection: string): string {
  const parts = splitTableStream(tableSection);
  const tableOpen = tableSection.match(/^<table\b[^>]*>/i)?.[0] ?? "<table>";

  let html = tableOpen;

  if (parts.theadComplete.length > 0 || parts.theadPartial) {
    html += "<thead>";
    html += parts.theadComplete.join("");
    if (parts.theadPartial) {
      html += markPartialRow(autoCloseFragment(parts.theadPartial));
    }
    html += "</thead>";
  }

  if (parts.tbodyComplete.length > 0 || parts.tbodyPartial) {
    html += "<tbody>";
    html += parts.tbodyComplete.join("");
    if (parts.tbodyPartial) {
      html += markPartialRow(autoCloseFragment(parts.tbodyPartial));
    }
    html += "</tbody>";
  }

  html += "</table>";
  return html;
}

const POST_TABLE_CLASS = "sh-post-table";

function renderPostTableTrack(postTrack: string): string {
  if (!postTrack) {
    return "";
  }
  return findTableStart(postTrack) !== -1
    ? assembleStreamHtml(postTrack)
    : closeOpenTags(postTrack);
}

function ensurePostTableHolder(firstTable: HTMLTableElement): HTMLElement {
  let postHolder = firstTable.nextElementSibling as HTMLElement | null;
  if (postHolder?.classList.contains(POST_TABLE_CLASS)) {
    return postHolder;
  }

  let next = firstTable.nextElementSibling;
  while (next && !next.classList.contains(POST_TABLE_CLASS)) {
    const remove = next;
    next = next.nextElementSibling;
    remove.remove();
  }

  postHolder = firstTable.nextElementSibling as HTMLElement | null;
  if (postHolder?.classList.contains(POST_TABLE_CLASS)) {
    return postHolder;
  }

  postHolder = document.createElement("div");
  postHolder.className = POST_TABLE_CLASS;
  firstTable.insertAdjacentElement("afterend", postHolder);
  return postHolder;
}

function patchPostTableTail(
  container: HTMLElement,
  displayHtml: string,
  track: string,
  previousTrack: string,
  tableEnd: number,
): boolean {
  const postTrack = track.slice(tableEnd);
  const prevTableStart = findTableStart(previousTrack);
  const prevTableEnd =
    prevTableStart === -1
      ? -1
      : firstCompleteTableEnd(previousTrack, prevTableStart);
  const prevPostTrack =
    prevTableEnd === -1 ? "" : previousTrack.slice(prevTableEnd);

  const firstTable = container.querySelector("table");
  if (!firstTable) {
    return false;
  }

  const postHolder = ensurePostTableHolder(firstTable);

  if (!postTrack.startsWith(prevPostTrack)) {
    postHolder.innerHTML = sanitizeHtml(renderPostTableTrack(postTrack));
    syncStreamingCaret(container, displayHtml, track);
    return true;
  }

  if (postTrack === prevPostTrack) {
    syncStreamingCaret(container, displayHtml, track);
    return true;
  }

  const patched = patchStreamingHtml(
    postHolder,
    displayHtml,
    postTrack,
    prevPostTrack,
  );
  if (!patched) {
    postHolder.innerHTML = sanitizeHtml(renderPostTableTrack(postTrack));
  }

  syncStreamingCaret(container, displayHtml, track);
  return true;
}

function patchFirstTableStream(
  container: HTMLElement,
  displayHtml: string,
  track: string,
  previousTrack: string,
): boolean {
  const tableStart = findTableStart(track);
  if (tableStart === -1) {
    return false;
  }

  const prefix = track.slice(0, tableStart);
  const tableEnd = firstCompleteTableEnd(track, tableStart);
  const tableTrack = tableEnd === -1 ? track : track.slice(0, tableEnd);

  if (!patchTableRows(container, displayHtml, tableTrack, prefix)) {
    return false;
  }

  if (tableEnd !== -1 && track.length > tableEnd) {
    return patchPostTableTail(
      container,
      displayHtml,
      track,
      previousTrack,
      tableEnd,
    );
  }

  syncStreamingCaret(container, displayHtml, track);
  return true;
}

interface TableStreamParts {
  theadComplete: string[];
  tbodyComplete: string[];
  theadPartial: string | null;
  tbodyPartial: string | null;
}

function sliceTagSection(
  tableSection: string,
  tag: "thead" | "tbody",
): string {
  const openRe = new RegExp(`<${tag}\\b`, "i");
  const openMatch = openRe.exec(tableSection);
  if (!openMatch || openMatch.index === undefined) {
    return tag === "tbody" ? sliceImplicitTbody(tableSection) : "";
  }

  const openIdx = openMatch.index;
  const afterOpen = tableSection.slice(openIdx);
  const closeRe = new RegExp(`</${tag}>`, "i");
  const closeMatch = closeRe.exec(afterOpen);

  if (closeMatch && closeMatch.index !== undefined) {
    return afterOpen.slice(0, closeMatch.index + closeMatch[0].length);
  }

  // Unclosed section — stop at the next table section tag
  const boundaryRe =
    tag === "thead" ? /<\/thead>|<tbody\b/i : /<\/tbody>|<\/table>/i;
  const boundaryMatch = boundaryRe.exec(afterOpen.slice(`<${tag}`.length));
  if (boundaryMatch && boundaryMatch.index !== undefined) {
    const end = `<${tag}`.length + boundaryMatch.index;
    return afterOpen.slice(0, end);
  }

  return afterOpen;
}

/** Body rows without an explicit <tbody> wrapper */
function sliceImplicitTbody(tableSection: string): string {
  const afterThead = tableSection.match(/<\/thead>/i);
  if (!afterThead && /<thead\b/i.test(tableSection)) {
    // Open thead — rows still belong to header, not implicit tbody
    return "";
  }

  const start = afterThead
    ? afterThead.index! + afterThead[0].length
    : tableSection.search(/<tr\b/i);
  if (start === -1) {
    return "";
  }
  const slice = tableSection.slice(start);
  const tableEnd = slice.search(/<\/table>/i);
  return tableEnd === -1 ? slice : slice.slice(0, tableEnd);
}

function splitTableStream(tableSection: string): TableStreamParts {
  const theadPart = sliceTagSection(tableSection, "thead");
  const tbodyPart = sliceTagSection(tableSection, "tbody");

  const theadComplete = theadPart ? extractCompleteRows(theadPart) : [];
  const tbodyComplete = tbodyPart ? extractCompleteRows(tbodyPart) : [];

  return {
    theadComplete,
    tbodyComplete,
    theadPartial: extractPartialRow(theadPart, theadComplete),
    tbodyPartial: extractPartialRow(tbodyPart, tbodyComplete),
  };
}

function extractPartialRow(
  section: string,
  completeRows: string[],
): string | null {
  if (!section) {
    return null;
  }

  let after = stripCompleteRows(section);
  for (const row of completeRows) {
    after = after.replace(row, "");
  }

  const match = after.match(/<tr[^>]*>[\s\S]*$/i);
  if (!match) {
    return null;
  }

  const partial = match[0]!;
  if (!/<tr/i.test(partial)) {
    return null;
  }

  // Ignore auto-closed empty rows — wait for cell content
  if (!CELL_RE.test(partial)) {
    return null;
  }

  return partial;
}

/**
 * Incrementally patch live DOM during streaming.
 * `trackClean` is strip-only HTML (no synthetic closers) used to detect real row boundaries.
 * `displayHtml` includes auto-closed tags for full-replace fallback and caret sync.
 * Returns true if patched in-place, false if caller should full replace.
 */
export function patchStreamingHtml(
  container: HTMLElement,
  displayHtml: string,
  trackClean: string,
  previousTrack: string,
): boolean {
  const track = stripCaret(trackClean);
  if (track === previousTrack) {
    return true;
  }

  const tableStart = findTableStart(track);
  const prevTableStart = findTableStart(previousTrack);

  // Table just started — append prefix then patch the table tail
  if (tableStart !== -1 && prevTableStart === -1) {
    const prefix = track.slice(0, tableStart);
    if (prefix.startsWith(previousTrack) || previousTrack.startsWith(prefix)) {
      if (prefix.length > previousTrack.length) {
        container.insertAdjacentHTML(
          "beforeend",
          prefix.slice(previousTrack.length),
        );
      }
      if (container.querySelector("table")) {
        return patchFirstTableStream(
          container,
          displayHtml,
          track,
          previousTrack,
        );
      }
    }
    return false;
  }

  // Table streaming — append rows instead of replacing the whole table
  if (
    tableStart !== -1 &&
    prevTableStart !== -1 &&
    tableStart === prevTableStart
  ) {
    const prefix = track.slice(0, tableStart);
    const prevPrefix = previousTrack.slice(0, prevTableStart);

    if (prefix === prevPrefix) {
      return patchFirstTableStream(
        container,
        displayHtml,
        track,
        previousTrack,
      );
    }
  }

  // Plain text only — append into open element or container root
  if (
    tableStart === -1 &&
    previousTrack.length > 0 &&
    track.startsWith(previousTrack)
  ) {
    const suffix = track.slice(previousTrack.length);
    if (suffix && isTextOnlySuffix(suffix)) {
      const stack = getOpenTagStack(track);
      if (stack.length > 0) {
        const target = findDeepOpenElement(container, stack);
        if (!target) {
          return false;
        }
        removeOrphanContainerText(container);
        appendStreamingTextChunk(target, suffix);
      } else {
        appendStreamingTextChunk(container, suffix);
      }
      syncStreamingCaret(container, displayHtml, track);
      return true;
    }
  }

  return false;
}

/** True when suffix is plain text with no markup (safe for flat append) */
function isTextOnlySuffix(suffix: string): boolean {
  return !/<[a-z!/]/i.test(suffix);
}

function countBodyRows(tbody: HTMLTableSectionElement): number {
  let count = 0;
  tbody.querySelectorAll("tr:not([data-sh-partial])").forEach((tr) => {
    if (!tr.querySelector("th")) {
      count++;
    }
  });
  return count;
}

function seedRowCountsFromDom(table: HTMLTableElement): void {
  if (table.dataset.shTheadRowCount === undefined) {
    const thead = table.querySelector("thead");
    table.dataset.shTheadRowCount = String(
      thead
        ? thead.querySelectorAll("tr:not([data-sh-partial])").length
        : 0,
    );
  }
  if (table.dataset.shRowCount === undefined) {
    const tbody = table.querySelector("tbody");
    table.dataset.shRowCount = String(tbody ? countBodyRows(tbody) : 0);
  }
}

function findActiveTable(container: HTMLElement): HTMLTableElement | null {
  const tables = container.querySelectorAll("table");
  if (tables.length === 0) {
    return null;
  }
  return tables[tables.length - 1] as HTMLTableElement;
}

function patchTableRows(
  container: HTMLElement,
  displayHtml: string,
  track: string,
  prefix: string,
): boolean {
  const table = findActiveTable(container);
  if (!table) {
    return false;
  }

  if (!table.dataset.shLayoutFixed) {
    table.style.tableLayout = "fixed";
    table.dataset.shLayoutFixed = "1";
  }

  seedRowCountsFromDom(table);

  const tableSection = track.slice(prefix.length);
  const parts = splitTableStream(tableSection);

  // Multiple <tr> opens with no </tr> in track — incremental append duplicates rows.
  const rowOpens = (tableSection.match(/<tr\b/gi) ?? []).length;
  if (
    !/<\/tr>/i.test(tableSection) &&
    rowOpens >= 2 &&
    parts.tbodyComplete.length === 0 &&
    parts.theadComplete.length === 0 &&
    (parts.tbodyPartial || parts.theadPartial)
  ) {
    return false;
  }

  let thead = table.querySelector("thead");
  if (!thead) {
    thead = document.createElement("thead");
    table.insertBefore(thead, table.firstChild);
  }

  let tbody = table.querySelector("tbody");
  if (!tbody) {
    tbody = document.createElement("tbody");
    table.appendChild(tbody);
  }

  // Drop header rows mistakenly patched into tbody during early stream frames
  if (parts.theadComplete.length > 0) {
    let removed = false;
    tbody.querySelectorAll("tr").forEach((tr) => {
      if (tr.querySelector("th")) {
        tr.remove();
        removed = true;
      }
    });
    if (removed) {
      table.dataset.shRowCount = String(countBodyRows(tbody));
    }
  }

  const theadStored = Number.parseInt(
    table.dataset.shTheadRowCount ?? "0",
    10,
  );
  const tbodyStored = Number.parseInt(table.dataset.shRowCount ?? "0", 10);

  if (parts.theadComplete.length > theadStored) {
    const newRows = parts.theadComplete.slice(theadStored);
    promoteOrAppendRows(thead, newRows);
    table.dataset.shTheadRowCount = String(parts.theadComplete.length);
    removePartialRow(thead);
  }

  if (parts.tbodyComplete.length > tbodyStored) {
    const newRows = parts.tbodyComplete.slice(tbodyStored);
    promoteOrAppendRows(tbody, newRows);
    table.dataset.shRowCount = String(parts.tbodyComplete.length);
    removePartialRow(tbody);
  }

  if (parts.theadPartial) {
    patchPartialRowInSection(thead, parts.theadPartial, parts.theadComplete.length);
    removePartialRow(tbody);
  } else if (parts.tbodyPartial) {
    patchPartialRowInSection(tbody, parts.tbodyPartial, parts.tbodyComplete.length);
    removePartialRow(thead);
  } else {
    removePartialRow(thead);
    removePartialRow(tbody);
  }

  syncStreamingCaret(container, displayHtml, track);
  return true;
}

function markPartialRow(rowHtml: string): string {
  return rowHtml.replace(/^<tr/i, '<tr data-sh-partial="1"');
}

/** Promote in-progress partial row to complete instead of duplicating */
function promoteOrAppendRows(
  section: HTMLTableSectionElement,
  newRows: string[],
): void {
  if (newRows.length === 0) {
    return;
  }

  const partial = section.querySelector("tr[data-sh-partial]");
  if (partial && newRows.length === 1) {
    partial.outerHTML = sanitizePatchFragment(newRows[0]!);
    return;
  }

  removePartialRow(section);
  insertSafeHtml(section, "beforeend", newRows.join(""));
}

function patchPartialRowInSection(
  section: HTMLTableSectionElement,
  partial: string,
  completeRowCount: number,
): void {
  const marked = markPartialRow(autoCloseFragment(partial));

  let partialTr = section.querySelector("tr[data-sh-partial]");
  if (!partialTr) {
    partialTr = findInProgressRow(section, completeRowCount);
  }

  if (!partialTr) {
    if (completeRowCount === 0) {
      // Malformed tables often emit multiple <tr> without </tr> — keep one partial row.
      section.querySelectorAll("tr").forEach((tr) => tr.remove());
      insertSafeHtml(section, "beforeend", marked);
      return;
    }
    insertSafeHtml(section, "beforeend", marked);
    return;
  }

  const prevHeight = partialTr.getBoundingClientRect().height;
  if (prevHeight > 0) {
    (partialTr as HTMLElement).style.minHeight = `${prevHeight}px`;
  }
  partialTr.outerHTML = sanitizePatchFragment(marked);
}

/** Reuse the streaming partial row when the track has no complete rows yet. */
function findInProgressRow(
  section: HTMLTableSectionElement,
  completeRowCount: number,
): HTMLTableRowElement | null {
  if (completeRowCount > 0 || section.querySelector("tr[data-sh-partial]")) {
    return null;
  }
  const rows = section.querySelectorAll("tr");
  if (rows.length === 0) {
    return null;
  }
  return rows[rows.length - 1] as HTMLTableRowElement;
}

function removePartialRow(section: HTMLTableSectionElement): void {
  section.querySelector("tr[data-sh-partial]")?.remove();
}

function stripCompleteRows(tableSection: string): string {
  return tableSection.replace(TR_RE, "");
}

function autoCloseFragment(fragment: string): string {
  const openTags: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*(\/)?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(fragment)) !== null) {
    const tag = match[1]!.toLowerCase();
    const isClose = match[0]![1] === "/";
    const isSelfClose = Boolean(match[2]) || match[0]!.endsWith("/>");

    if (isClose) {
      const idx = openTags.lastIndexOf(tag);
      if (idx !== -1) {
        openTags.splice(idx);
      }
    } else if (!isSelfClose) {
      openTags.push(tag);
    }
  }

  let result = fragment;
  for (let i = openTags.length - 1; i >= 0; i--) {
    result += `</${openTags[i]}>`;
  }
  return result;
}

/** Remove every streaming caret under `container` (open-tag stack moves leave orphans). */
export function removeStreamingCarets(container: HTMLElement): void {
  container.querySelectorAll(".sh-caret").forEach((node) => node.remove());
}

export function syncStreamingCaret(
  container: HTMLElement,
  html: string,
  track?: string,
): void {
  if (!CARET_RE.test(html)) {
    removeStreamingCarets(container);
    return;
  }

  const cleanTrack = stripCaret(track ?? html);
  const caret = acquireStreamingCaret(container);

  if (!shouldShowStreamingCaret(cleanTrack)) {
    setStreamingCaretVisible(caret, false);
    return;
  }

  setStreamingCaretVisible(caret, true);
  const { range, fallback } = resolveStreamCaretRange(container, cleanTrack);
  positionStreamingCaretAtRange(caret, container, range, fallback);
}

/** Reset patch state when doing a full innerHTML replace */
export function resetPatchState(container: HTMLElement): void {
  container.querySelectorAll("table").forEach((table) => {
    delete table.dataset.shRowCount;
    delete table.dataset.shTheadRowCount;
    delete table.dataset.shLayoutFixed;
  });
}

/** Build renderable HTML from strip-only track (no premature </tr>) */
export function assembleStreamHtml(track: string): string {
  const tableStart = findTableStart(track);
  if (tableStart === -1) {
    return track;
  }

  const tableEnd = firstCompleteTableEnd(track, tableStart);
  const prefix = track.slice(0, tableStart);

  if (tableEnd === -1) {
    return prefix + assembleTableSectionHtml(track.slice(tableStart));
  }

  const firstTable = assembleTableSectionHtml(track.slice(tableStart, tableEnd));
  const postTrack = track.slice(tableEnd);
  const postHtml =
    findTableStart(postTrack) !== -1
      ? assembleStreamHtml(postTrack)
      : closeOpenTags(postTrack);

  return prefix + firstTable + postHtml;
}

/** Close non-table tags only (table rows need real </tr> in source) */
function closeOpenTagsForStream(html: string): string {
  if (findTableStart(html) !== -1) {
    return assembleStreamHtml(html);
  }
  const openTags: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*(\/)?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[1]!.toLowerCase();
    const isClose = match[0]![1] === "/";
    const isSelfClose = Boolean(match[2]) || match[0]!.endsWith("/>");

    if (isClose) {
      const idx = openTags.lastIndexOf(tag);
      if (idx !== -1) {
        openTags.splice(idx);
      }
    } else if (!isSelfClose) {
      openTags.push(tag);
    }
  }

  let result = html;
  for (let i = openTags.length - 1; i >= 0; i--) {
    result += `</${openTags[i]}>`;
  }
  return result;
}

/** Seed row counts from strip-only track (not DOM — avoids counting fallback partial rows) */
export function initTableRowCountsFromTrack(
  container: HTMLElement,
  track: string,
): void {
  const table = container.querySelector("table");
  if (!table) {
    return;
  }

  const tableStart = findTableStart(track);
  if (tableStart === -1) {
    return;
  }

  const tableEnd = firstCompleteTableEnd(track, tableStart);
  const tableSection =
    tableEnd === -1
      ? track.slice(tableStart)
      : track.slice(tableStart, tableEnd);
  const parts = splitTableStream(tableSection);
  table.dataset.shTheadRowCount = String(parts.theadComplete.length);
  table.dataset.shRowCount = String(parts.tbodyComplete.length);
  table.style.tableLayout = "fixed";
  table.dataset.shLayoutFixed = "1";
}

/** Seed row counts after a full render so incremental patches stay in sync */
export function initTableRowCounts(container: HTMLElement): void {
  container.querySelectorAll("table").forEach((table) => {
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    table.dataset.shTheadRowCount = String(
      thead
        ? thead.querySelectorAll("tr:not([data-sh-partial])").length
        : 0,
    );
    table.dataset.shRowCount = String(
      tbody ? countBodyRows(tbody) : 0,
    );
    table.style.tableLayout = "fixed";
    table.dataset.shLayoutFixed = "1";
  });
}
