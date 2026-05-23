/**
 * Single long-form HTML stream that exercises every StreamHtml capability.
 * Used as the flagship demo on the examples page.
 */
import {
  ATTRIBUTE_FRACTURE,
  BEZIER_SVG,
  DEEP_NESTING,
  giantPreBlock,
  INTERACTIVE_STATE_TRAP,
  MALFORMED_SOUP,
  NESTED_TABLE_CALLOUT,
  ORDERED_COUNTERS,
  performanceBomb,
  SPANNING_TABLE,
} from "./claude-edge-cases";
import {
  CSS_DONUT_CHART,
  DATA_TABLE,
  LATEX_HEAVY,
  METRICS_DASHBOARD,
  SVG_BAR_CHART,
  SVG_LINE_CHART,
} from "./visual-html";

const INTRO = `<div class="callout success" style="font-size:14px;line-height:1.6">
  <strong>StreamHtml — ultimate capability showcase</strong><br/>
  One continuous LLM-style HTML stream exercising every renderer feature below.
  Use <strong>Normal</strong> or <strong>Char</strong> speed to show incremental patching, table row append, SVG SMIL unlock, KaTeX, and edge-case repair.
</div>
<div class="section-h">What this stream demonstrates</div>
<table class="rt">
  <thead><tr><th>Capability</th><th>Section</th><th>What to watch</th></tr></thead>
  <tbody>
    <tr><td>Metrics grid</td><td>§1</td><td>4-up cards stream without layout collapse</td></tr>
    <tr><td>SMIL SVG animations</td><td>§2</td><td>Each SVG animates when closed; keeps running on later chunks</td></tr>
    <tr><td>Charts</td><td>§3</td><td>Bar, line, CSS donut — partial SVG paths until closed</td></tr>
    <tr><td>Data tables</td><td>§4–§5</td><td>Rows append incrementally; colspan/rowspan stress</td></tr>
    <tr><td>LaTeX / KaTeX</td><td>§6</td><td>Formulas typeset as <code>data-latex</code> arrives</td></tr>
    <tr><td>Rich content</td><td>§7–§10</td><td>Compare, diff, timeline, recipe, quiz</td></tr>
    <tr><td>Interactive HTML</td><td>§11</td><td>Form + details mid-stream (state resets on patch)</td></tr>
    <tr><td>Edge-case repair</td><td>§12–§16</td><td>Malformed soup, deep nest, attribute fractures</td></tr>
    <tr><td>Long-tail stress</td><td>§17–§18</td><td>4k <code>&lt;pre&gt;</code> block + 72 metric cards</td></tr>
  </tbody>
</table>`;

const SMIL_ANIMATIONS = `<div class="section-h">§2 — SMIL SVG animations</div>
<div class="callout info">Three animated SVGs. Each unlocks when its <code>&lt;/svg&gt;</code> arrives — animations must <strong>not</strong> restart on every chunk.</div>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-bottom:12px">
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#fafaf8">
    <div style="font-size:11px;color:#888;margin-bottom:6px;text-transform:uppercase">Orbital motion</div>
    <svg viewBox="0 0 280 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Orbiting planet">
      <rect width="280" height="100" fill="#fff" rx="6"/>
      <circle cx="140" cy="50" r="16" fill="#fbbf24"/>
      <circle cx="140" cy="50" r="38" fill="none" stroke="#e5e7eb" stroke-width="1.5"/>
      <circle r="7" fill="#3b82f6">
        <animateMotion dur="5s" repeatCount="indefinite" path="M 178,50 A 38,38 0 1,1 177.9,50"/>
      </circle>
      <circle r="4" fill="#dc2626" opacity="0.85">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M 155,50 A 20,20 0 1,1 154.9,50"/>
      </circle>
    </svg>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#fafaf8">
    <div style="font-size:11px;color:#888;margin-bottom:6px;text-transform:uppercase">Pulsing metrics</div>
    <svg viewBox="0 0 280 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="100" fill="#fff" rx="6"/>
      <circle cx="50" cy="50" r="14" fill="#8b5cf6">
        <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
      </circle>
      <rect x="90" y="35" width="20" height="30" fill="#3b82f6" rx="3">
        <animate attributeName="height" values="30;55;30" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="y" values="35;10;35" dur="1.5s" repeatCount="indefinite"/>
      </rect>
      <rect x="130" y="25" width="20" height="40" fill="#16a34a" rx="3">
        <animate attributeName="height" values="40;60;40" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="y" values="25;5;25" dur="1.8s" repeatCount="indefinite"/>
      </rect>
      <rect x="170" y="40" width="20" height="25" fill="#d97706" rx="3">
        <animate attributeName="height" values="25;50;25" dur="1.2s" repeatCount="indefinite"/>
        <animate attributeName="y" values="40;15;40" dur="1.2s" repeatCount="indefinite"/>
      </rect>
      <text x="220" y="55" font-size="13" fill="#666">live</text>
    </svg>
  </div>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;background:#fafaf8">
    <div style="font-size:11px;color:#888;margin-bottom:6px;text-transform:uppercase">Rotating transform</div>
    <svg viewBox="0 0 280 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="280" height="100" fill="#fff" rx="6"/>
      <g transform="translate(140,50)">
        <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="3s" repeatCount="indefinite" additive="sum"/>
        <line x1="-30" y1="0" x2="30" y2="0" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
        <line x1="0" y1="-30" x2="0" y2="30" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
        <circle r="6" fill="#1a1a18"/>
      </g>
    </svg>
  </div>
</div>
<div class="callout success">Gravity formula (static SVG between animations): <span class="math-inline" data-latex="F = G\\frac{m_1 m_2}{r^2}"></span></div>`;

const CHARTS = `<div class="section-h">§3 — Charts (SVG + CSS)</div>
${SVG_BAR_CHART}
${SVG_LINE_CHART}
<div class="section-h">Traffic by device</div>
${CSS_DONUT_CHART}`;

const TABLES = `<div class="section-h">§4 — Incremental data table</div>
<div class="callout info">Table rows should append one-by-one — never duplicate thead or flash empty rows.</div>
${DATA_TABLE}
<div class="section-h">§5 — Colspan / rowspan stress</div>
${SPANNING_TABLE}`;

const LATEX_SECTION = `<div class="section-h">§6 — LaTeX via data-latex</div>
<div class="callout info">KaTeX typesets each formula as its <code>data-latex</code> attribute completes.</div>
${LATEX_HEAVY}
<table class="rt">
  <thead><tr><th>Formula</th><th>Name</th></tr></thead>
  <tbody>
    <tr><td><span class="math-inline" data-latex="E = mc^2"></span></td><td>Mass–energy equivalence</td></tr>
    <tr><td><span class="math-inline" data-latex="\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}"></span></td><td>Basel problem</td></tr>
    <tr><td><span class="math-inline" data-latex="\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}"></span></td><td>Gauss's law</td></tr>
  </tbody>
</table>`;

const RICH_CONTENT = `<div class="section-h">§7 — Framework comparison</div>
<div class="cmp-grid">
  <div class="cmp-col">
    <div class="cmp-hdr react">React</div>
    <div class="cmp-row"><span class="ck">✓</span>Largest ecosystem and hiring pool</div>
    <div class="cmp-row"><span class="ck">✓</span>Server Components + Next.js</div>
    <div class="cmp-row"><span class="cx">✗</span>Boilerplate for simple UIs</div>
  </div>
  <div class="cmp-col">
    <div class="cmp-hdr vue">Vue</div>
    <div class="cmp-row"><span class="ck">✓</span>Fastest onboarding curve</div>
    <div class="cmp-row"><span class="ck">✓</span>Composition API + Nuxt</div>
    <div class="cmp-row"><span class="cx">✗</span>Smaller enterprise footprint</div>
  </div>
</div>
<div class="section-h">§8 — Code diff review</div>
<div class="diff">
  <div class="diff-hdr">middleware/auth.ts</div>
  <div class="diff-sec">@@ streaming patch preserves text placement @@</div>
  <div class="diff-rem">- const token = req.headers['x-token'];</div>
  <div class="diff-add">+ const token = req.headers.authorization?.split(' ')[1];</div>
  <div class="diff-add">+ if (payload.exp &lt; Date.now() / 1000) return res.status(401);</div>
</div>
<div class="section-h">§9 — Project timeline</div>
<div class="timeline">
  <div class="tl-item done"><div class="tl-dot"></div><div class="tl-body"><strong>Phase 1</strong> — Core rehtml repair + sanitize</div></div>
  <div class="tl-item done"><div class="tl-dot"></div><div class="tl-body"><strong>Phase 2</strong> — Incremental table patching</div></div>
  <div class="tl-item active"><div class="tl-dot"></div><div class="tl-body"><strong>Phase 3</strong> — SVG SMIL freeze + stable blocks <span class="badge yellow">live</span></div></div>
  <div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><strong>Phase 4</strong> — Production chat integration</div></div>
</div>
<div class="section-h">§10 — Recipe + quiz</div>
<h3>Streaming HTML sourdough</h3>
<p class="muted">Prep 20 min · Bulk 4 hrs · Bake 25 min</p>
<ol class="steps">
  <li><strong>Autolyse</strong> — Mix flour + water, rest 30 min.</li>
  <li><strong>Mix</strong> — Add starter, salt, olive oil.</li>
  <li><strong>Folds</strong> — Stretch-and-fold ×4 every 30 min.</li>
  <li><strong>Bake</strong> — 230°C, 22–25 min until golden.</li>
</ol>
<div class="quiz">
  <div class="quiz-q"><span class="quiz-n">1</span> What does StreamHtml do with incomplete tags?</div>
  <div class="quiz-a correct">Strips trailing fragments, auto-closes for display, never crashes.</div>
  <div class="quiz-q"><span class="quiz-n">2</span> When do SMIL animations start?</div>
  <div class="quiz-a correct">When their enclosing <code>&lt;svg&gt;</code> is complete in the raw track.</div>
</div>`;

const INTERACTIVE = `<div class="section-h">§11 — Interactive elements mid-stream</div>
${INTERACTIVE_STATE_TRAP}`;

const EDGE_CASES = `<div class="section-h">§12 — Bezier SVG path</div>
${BEZIER_SVG}
<div class="section-h">§13 — Malformed HTML soup</div>
${MALFORMED_SOUP}
<div class="section-h">§14 — Mid-attribute fracture recovery</div>
${ATTRIBUTE_FRACTURE}
<div class="section-h">§15 — Ordered list counters</div>
${ORDERED_COUNTERS}
<div class="section-h">§16 — Table + callout interleave</div>
${NESTED_TABLE_CALLOUT}
<div class="section-h">§16b — Deep same-tag nesting</div>
${DEEP_NESTING}`;

const STRESS = `<div class="section-h">§17 — Giant pre block</div>
${giantPreBlock(4000)}
<div class="section-h">§18 — Performance grid (72 cards)</div>
${performanceBomb(72)}`;

const OUTRO = `<div class="section-h">§19 — Error log + pricing</div>
<div class="callout error"><strong>Spike detected</strong> — 412 ConnectionTimeout errors in the last hour.</div>
<table class="rt">
  <thead><tr><th>Error</th><th>Count</th><th>Service</th></tr></thead>
  <tbody>
    <tr><td><code>ConnectionTimeout</code></td><td>412</td><td>api-gateway</td></tr>
    <tr><td><code>RedisConnectionRefused</code></td><td>298</td><td>cache-worker</td></tr>
    <tr><td><code>ValidationError</code></td><td>89</td><td>signup-api</td></tr>
  </tbody>
</table>
<div class="section-h">Recommended plan</div>
<table class="rt">
  <thead><tr><th>Feature</th><th>Pro</th><th>Enterprise</th></tr></thead>
  <tbody>
    <tr><td>MAU</td><td>50,000</td><td>Unlimited</td></tr>
    <tr><td>Streaming HTML</td><td><span class="badge green">✓</span></td><td><span class="badge green">✓</span></td></tr>
    <tr><td>SSO / SAML</td><td>—</td><td><span class="badge green">✓</span></td></tr>
    <tr><td>Price</td><td><strong>$49/mo</strong></td><td>Contact sales</td></tr>
  </tbody>
</table>
<div class="callout success" style="margin-top:16px">
  <strong>End of showcase.</strong> Stream completed — stable blocks memoized, animations still running, tables intact, formulas rendered. Scroll back up to verify nothing jumped or duplicated.
</div>`;

/** Full flagship demo payload (~35k+ chars). */
export const ULTIMATE_SHOWCASE = [
  INTRO,
  `<div class="section-h">§1 — Live metrics dashboard</div>`,
  METRICS_DASHBOARD,
  `<div class="callout warn"><strong>Alert:</strong> p99 latency elevated on <code>/api/reports</code> — read replica recommended.</div>`,
  SMIL_ANIMATIONS,
  CHARTS,
  TABLES,
  LATEX_SECTION,
  RICH_CONTENT,
  INTERACTIVE,
  EDGE_CASES,
  STRESS,
  OUTRO,
].join("\n");

export const ULTIMATE_SHOWCASE_SECTIONS = [
  "Intro & checklist",
  "Metrics grid",
  "SMIL SVG animations",
  "Charts",
  "Tables",
  "LaTeX",
  "Rich content",
  "Interactive",
  "Edge cases",
  "Stress tests",
  "Outro",
] as const;
