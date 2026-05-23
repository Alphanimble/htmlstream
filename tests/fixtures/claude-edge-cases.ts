/** Hard streaming edge cases — curated stress payloads for manual + automated testing */

export const INTERACTIVE_STATE_TRAP = `<div class="section-h">Stateful elements mid-stream</div>
<div class="callout warn"><strong>Expected mid-stream quirks (our side):</strong> auto-closed <code>&lt;details&gt;</code> may show a closed chevron while the paragraph is already visible — it snaps correct when the stream finishes. Typing in the fields or toggling details will reset on the next chunk because structural updates still use <code>innerHTML</code> fallback.</div>
<details open>
  <summary>Click me — do I snap shut on the next chunk?</summary>
  <p>If the live tail does full <code>innerHTML</code> replacement, open state and focus die. Incremental patching preserves text placement but not yet interactive state.</p>
</details>
<div class="stream-form">
  <label>Name <input type="text" placeholder="type here mid-stream"></label>
  <label>Notes <textarea rows="3" placeholder="Does focus survive the next chunk?"></textarea></label>
  <button type="button">Non-submit button</button>
</div>`;

export const SPANNING_TABLE = `<div class="section-h">Colspan + rowspan (no explicit tbody)</div>
<div class="callout info">Browsers auto-correct malformed tables. Stream 5 chars at a time and watch layout jump.</div>
<table class="rt">
  <tr><td colspan="3"><strong>Q2 revenue — all regions</strong></td></tr>
  <tr>
    <td rowspan="2">Americas</td>
    <td>Enterprise</td>
    <td>$2.4M</td>
  </tr>
  <tr>
    <td>SMB</td>
    <td>$890K</td>
  </tr>
  <tr>
    <td rowspan="2">EMEA</td>
    <td>Enterprise</td>
    <td>$1.8M</td>
  </tr>
  <tr>
    <td>SMB</td>
    <td>$420K</td>
  </tr>
  <tr><td colspan="3"><em>Total: $5.51M</em></td></tr>
</table>`;

export const BEZIER_SVG = `<div class="section-h">SVG path mid-stream</div>
<div class="callout info">Partial <code>&lt;path d="..."&gt;</code> is invalid — nothing renders until the path closes.</div>
<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bezier curve">
  <rect width="200" height="100" fill="#fafaf8"/>
  <path d="M 10 50 Q 50 10 100 50 T 190 50" stroke="#3b82f6" fill="none" stroke-width="2"/>
  <circle cx="100" cy="50" r="20" fill="#dc2626" opacity="0.45"/>
  <text x="100" y="55" text-anchor="middle" font-size="12" fill="#666">SVG in HTML</text>
</svg>`;

export const DEEP_NESTING = `<div class="section-h">Deep same-tag nesting</div>
<div class="callout warn">Stress-tests block splitter depth — one stable unit, not seven half-broken blocks.</div>
<div class="outer">
  <div class="mid">
    <div class="inner">
      <ul>
        <li>
          <ul>
            <li>
              <ul>
                <li><div><p>Five levels of <strong>nested block tags</strong>, all the same kind.</p></div></li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</div>`;

export const MALFORMED_SOUP = `<div class="section-h">Adversarial / malformed HTML</div>
<div class="callout error">Models hallucinate broken markup. Renderer must not crash or flash garbage.</div>
<div class="callout warn">
  <p>Unclosed paragraph
  <p>Another paragraph inside the unclosed one
  <ul>
    <li>List item without close
    <li>Another one
  <div>Nested div that closes the wrong scope</p>
</div>
<table class="rt"><tr><td>Cell with no closing tags
<tr><td>Second row also naked</table>`;

export const ATTRIBUTE_FRACTURE = `<div class="section-h">Mid-attribute streaming</div>
<div class="callout info">Chunks can split inside <code>class="..."</code> or <code>href="..."</code>. Incomplete tags should strip cleanly.</div>
<div class="metric good">
  <div class="metric-val">42</div>
  <div class="metric-lbl">baseline metric</div>
</div>
<a class="badge blue" href="https://example.com/docs/streaming-html">Safe link after attributes complete</a>
<p>Trailing plain text after the link should stream inside this paragraph, not at the container root.</p>`;

export const ORDERED_COUNTERS = `<div class="section-h">CSS counters + ordered lists</div>
<div class="callout info">If each <code>&lt;li&gt;</code> becomes its own stable block, counters reset per item.</div>
<ol class="counter-list">
  <li>First item — should read <strong>1</strong></li>
  <li>Second item — should read <strong>2</strong></li>
  <li>Third item — should read <strong>3</strong></li>
  <li>Fourth item — nested list below</li>
</ol>
<ol class="counter-list">
  <li>Sub-list A</li>
  <li>Sub-list B</li>
</ol>`;

export const NESTED_TABLE_CALLOUT = `<div class="callout info">Outer callout wraps an inner mini-table — interleaved block boundaries.</div>
<table class="rt">
  <thead><tr><th>Layer</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>Callout shell</td><td><span class="badge green">stable</span></td></tr>
    <tr><td>Table header</td><td><span class="badge yellow">streaming</span></td></tr>
    <tr><td>Table body rows</td><td><span class="badge blue">incremental</span></td></tr>
  </tbody>
</table>
<div class="callout success">Footer callout after table — text must stream inside, not below the card.</div>`;

/** ~8k chars — long enough to stress live-tail re-renders without freezing the demo */
export function giantPreBlock(charCount = 8000): string {
  const line = "// const payload = await fetch('/api/v1/reports?cursor=' + cursor);\n";
  const body = line.repeat(Math.ceil(charCount / line.length)).slice(0, charCount);
  return `<div class="section-h">Giant &lt;pre&gt; block (${charCount.toLocaleString()} chars)</div>
<div class="callout warn">No natural split point for ages — live tail re-renders the entire block each chunk unless batched.</div>
<pre class="code-block">${body}</pre>
<p class="muted">End marker — if you see this, the pre closed correctly.</p>`;
}

export const GIANT_PRE = giantPreBlock(8000);

/** 120 metric cards — profile scroll FPS after stream completes */
export function performanceBomb(count = 120): string {
  const cards = Array.from({ length: count }, (_, i) => {
    const tone = i % 3 === 0 ? "good" : i % 3 === 1 ? "warn" : "bad";
    return `<div class="metric ${tone}"><div class="metric-val">${(i * 7) % 1000}</div><div class="metric-lbl">metric ${i + 1}</div></div>`;
  }).join("\n");
  return `<div class="section-h">Performance bomb (${count} metric cards)</div>
<div class="callout info">After streaming completes, scroll fast. FPS drops if stable blocks aren't actually memoized. Cards expand the main chat scroll — no nested scroll trap.</div>
<div class="metrics perf-grid">${cards}</div>`;
}

export const PERF_BOMB = performanceBomb(120);

export const CLAUDE_EDGE_CASES = {
  INTERACTIVE_STATE_TRAP,
  SPANNING_TABLE,
  BEZIER_SVG,
  DEEP_NESTING,
  MALFORMED_SOUP,
  ATTRIBUTE_FRACTURE,
  ORDERED_COUNTERS,
  NESTED_TABLE_CALLOUT,
  GIANT_PRE,
  PERF_BOMB,
} as const;

/** Sweep set — excludes heavy cases tested separately with longer timeouts */
export const CLAUDE_STREAM_SWEEP = Object.fromEntries(
  Object.entries(CLAUDE_EDGE_CASES).filter(
    ([id]) => id !== "PERF_BOMB" && id !== "GIANT_PRE",
  ),
) as Omit<typeof CLAUDE_EDGE_CASES, "PERF_BOMB" | "GIANT_PRE">;

export type ClaudeEdgeCaseId = keyof typeof CLAUDE_EDGE_CASES;
