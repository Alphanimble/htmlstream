import {
  ATTRIBUTE_FRACTURE,
  BEZIER_SVG,
  DEEP_NESTING,
  GIANT_PRE,
  INTERACTIVE_STATE_TRAP,
  MALFORMED_SOUP,
  NESTED_TABLE_CALLOUT,
  ORDERED_COUNTERS,
  PERF_BOMB,
  SPANNING_TABLE,
} from "../tests/fixtures/claude-edge-cases";
import {
  CSS_DONUT_CHART,
  DATA_TABLE,
  FULL_DASHBOARD,
  SVG_BAR_CHART,
  SVG_LINE_CHART,
} from "../tests/fixtures/visual-html";
import { ULTIMATE_SHOWCASE } from "../tests/fixtures/ultimate-showcase";

export interface DemoExample {
  id: string;
  label: string;
  category: string;
  html: string;
}

export const EXAMPLES: DemoExample[] = [
  {
    id: "ultimate-showcase",
    label: "★ Ultimate showcase — all capabilities",
    category: "Showcase",
    html: ULTIMATE_SHOWCASE,
  },
  {
    id: "svg-bar",
    label: "SVG bar chart",
    category: "Charts",
    html: `${SVG_BAR_CHART}
<div class="callout info">Q4 beat target by 18% — inline SVG streams rect-by-rect without layout jitter.</div>`,
  },
  {
    id: "svg-line",
    label: "SVG line chart",
    category: "Charts",
    html: `<div class="section-h">Weekly active users</div>
${SVG_LINE_CHART}
<div class="chart-legend">
  <span class="legend-dot" style="background:#3b82f6"></span> W1–W5 trend
  <span class="legend-dot" style="background:#16a34a"></span> current week
</div>`,
  },
  {
    id: "css-donut",
    label: "CSS donut chart",
    category: "Charts",
    html: `<div class="section-h">Traffic by device</div>
${CSS_DONUT_CHART}
<div class="callout success">Pure HTML + inline CSS — no canvas, no JS. Works great streamed from an LLM.</div>`,
  },
  {
    id: "full-dashboard",
    label: "Full dashboard (stress test)",
    category: "Dashboards",
    html: FULL_DASHBOARD,
  },
  {
    id: "regional-data",
    label: "Regional revenue table",
    category: "Data",
    html: `<div class="callout info">FY2025 revenue breakdown by region — table rows stream incrementally.</div>
${DATA_TABLE}
<div class="callout warn">APAC churn elevated — investigate onboarding funnel drop-off at step 3.</div>`,
  },
  {
    id: "api-perf",
    label: "API performance analysis",
    category: "Dashboards",
    html: `<div class="metrics">
  <div class="metric good">
    <div class="metric-val">142ms</div>
    <div class="metric-lbl">avg latency</div>
    <div class="bar-wrap"><div class="bar-fill good" style="width:14%"></div></div>
  </div>
  <div class="metric warn">
    <div class="metric-val">1.2%</div>
    <div class="metric-lbl">error rate</div>
    <div class="bar-wrap"><div class="bar-fill warn" style="width:60%"></div></div>
  </div>
  <div class="metric bad">
    <div class="metric-val">4.8s</div>
    <div class="metric-lbl">p99 latency</div>
    <div class="bar-wrap"><div class="bar-fill bad" style="width:96%"></div></div>
  </div>
  <div class="metric good">
    <div class="metric-val">99.1%</div>
    <div class="metric-lbl">uptime 30d</div>
    <div class="bar-wrap"><div class="bar-fill good" style="width:99%"></div></div>
  </div>
</div>
<div class="callout warn"><strong>p99 is the culprit.</strong> Tail latency points to a slow query on <code>/api/reports</code>.</div>
<div class="section-h">Endpoint breakdown</div>
<table class="rt">
  <thead><tr><th>Endpoint</th><th>Req/min</th><th>Avg</th><th>p99</th><th>Errors</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td><code>/api/users</code></td><td>2,840</td><td>68ms</td><td>210ms</td><td>0.1%</td><td><span class="badge green">healthy</span></td></tr>
    <tr><td><code>/api/orders</code></td><td>1,290</td><td>185ms</td><td>890ms</td><td>0.8%</td><td><span class="badge yellow">degraded</span></td></tr>
    <tr><td><code>/api/reports</code></td><td>340</td><td>1.2s</td><td>4.8s</td><td>3.4%</td><td><span class="badge red">critical</span></td></tr>
    <tr><td><code>/api/search</code></td><td>5,100</td><td>42ms</td><td>180ms</td><td>0.0%</td><td><span class="badge green">healthy</span></td></tr>
    <tr><td><code>/api/auth</code></td><td>890</td><td>95ms</td><td>320ms</td><td>0.2%</td><td><span class="badge green">healthy</span></td></tr>
    <tr><td><code>/api/webhooks</code></td><td>120</td><td>340ms</td><td>1.1s</td><td>1.8%</td><td><span class="badge yellow">degraded</span></td></tr>
  </tbody>
</table>
<div class="callout info"><strong>Fix:</strong> Add composite index on <code>(user_id, created_at, status)</code> and route reports to a read replica.</div>`,
  },
  {
    id: "react-vue",
    label: "React vs Vue comparison",
    category: "Analysis",
    html: `<div class="cmp-grid">
  <div class="cmp-col">
    <div class="cmp-hdr react">React</div>
    <div class="cmp-row"><span class="ck">✓</span>Largest ecosystem and job market</div>
    <div class="cmp-row"><span class="ck">✓</span>RSC + Next.js for full-stack</div>
    <div class="cmp-row"><span class="ck">✓</span>TypeScript-first by convention</div>
    <div class="cmp-row"><span class="td">~</span>JSX is flexible but verbose</div>
    <div class="cmp-row"><span class="cx">✗</span>Steeper initial learning curve</div>
  </div>
  <div class="cmp-col">
    <div class="cmp-hdr vue">Vue</div>
    <div class="cmp-row"><span class="ck">✓</span>Gentler onboarding</div>
    <div class="cmp-row"><span class="ck">✓</span>Composition API is clean</div>
    <div class="cmp-row"><span class="ck">✓</span>Nuxt for full-stack</div>
    <div class="cmp-row"><span class="td">~</span>SFCs are opinionated</div>
    <div class="cmp-row"><span class="cx">✗</span>Smaller hiring pool</div>
  </div>
</div>
<div class="callout success"><strong>Verdict:</strong> React for hiring and long-term; Vue for small teams shipping fast.</div>
<table class="rt">
  <thead><tr><th>Scenario</th><th>Pick</th><th>Reason</th></tr></thead>
  <tbody>
    <tr><td>Enterprise SaaS</td><td><span class="badge blue">React</span></td><td>Ecosystem, hiring pool</td></tr>
    <tr><td>Internal tooling</td><td><span class="badge green">Vue</span></td><td>Faster to ship</td></tr>
    <tr><td>Marketing site</td><td><span class="badge blue">React</span></td><td>Next.js + Vercel</td></tr>
    <tr><td>Startup MVP</td><td><span class="badge green">Vue</span></td><td>Less config</td></tr>
  </tbody>
</table>`,
  },
  {
    id: "auth-diff",
    label: "Auth refactor review",
    category: "Code",
    html: `<div class="callout info">Auth middleware refactor — 3 files, tighter token validation.</div>
<div class="diff">
  <div class="diff-hdr">middleware/auth.ts</div>
  <div class="diff-sec">@@ -12,7 +12,13 @@ export const authMiddleware</div>
  <div class="diff-ctx">  export const authMiddleware = async (req, res, next) => {</div>
  <div class="diff-rem">-   const token = req.headers['x-token'];</div>
  <div class="diff-add">+   const token = req.headers.authorization?.split(' ')[1];</div>
  <div class="diff-add">+   if (payload.exp &lt; Date.now() / 1000) return res.status(401);</div>
  <div class="diff-ctx">      req.user = payload; next();</div>
</div>
<table class="rt">
  <thead><tr><th>File</th><th>Added</th><th>Removed</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td><code>middleware/auth.ts</code></td><td style="color:#16a34a">+4</td><td style="color:#dc2626">-3</td><td>Stricter validation</td></tr>
    <tr><td><code>routes/auth.ts</code></td><td style="color:#16a34a">+18</td><td style="color:#dc2626">-0</td><td>Refresh endpoint</td></tr>
    <tr><td><code>types/auth.d.ts</code></td><td style="color:#16a34a">+6</td><td style="color:#dc2626">-1</td><td>Payload types</td></tr>
  </tbody>
</table>
<div class="callout warn"><strong>Breaking:</strong> Header renamed to <code>Authorization: Bearer</code>.</div>`,
  },
  {
    id: "pricing",
    label: "Pricing tier breakdown",
    category: "Business",
    html: `<div class="section-h">Recommended plan</div>
<div class="callout success"><strong>Pro</strong> fits your usage profile — 50k MAU, 3 team seats, priority support.</div>
<table class="rt">
  <thead><tr><th>Feature</th><th>Free</th><th>Pro</th><th>Enterprise</th></tr></thead>
  <tbody>
    <tr><td>Monthly active users</td><td>1,000</td><td>50,000</td><td>Unlimited</td></tr>
    <tr><td>Team seats</td><td>1</td><td>10</td><td>Unlimited</td></tr>
    <tr><td>API rate limit</td><td>100/min</td><td>1,000/min</td><td>Custom</td></tr>
    <tr><td>SSO / SAML</td><td>—</td><td>—</td><td><span class="badge green">✓</span></td></tr>
    <tr><td>Audit logs</td><td>7 days</td><td>90 days</td><td>1 year</td></tr>
    <tr><td>Price</td><td>$0</td><td><strong>$49/mo</strong></td><td>Contact sales</td></tr>
  </tbody>
</table>`,
  },
  {
    id: "recipe",
    label: "Recipe with steps",
    category: "Content",
    html: `<h3>Sourdough Focaccia</h3>
<p class="muted">Prep 20 min · Rise 4 hrs · Bake 25 min · Makes 1 tray</p>
<div class="callout info">Use active starter fed 4–6 hours before mixing.</div>
<ol class="steps">
  <li><strong>Autolyse</strong> — Mix 500g flour, 350g water. Rest 30 min.</li>
  <li><strong>Mix</strong> — Add 100g starter, 10g salt, 15g olive oil.</li>
  <li><strong>Folds</strong> — Stretch-and-fold every 30 min, 4 times.</li>
  <li><strong>Proof</strong> — Bulk 3 hrs, then cold retard 12–24 hrs.</li>
  <li><strong>Bake</strong> — Dimple, drizzle oil, 230°C for 22–25 min.</li>
</ol>
<table class="rt">
  <thead><tr><th>Ingredient</th><th>Amount</th><th>Notes</th></tr></thead>
  <tbody>
    <tr><td>Bread flour</td><td>500g</td><td>12–13% protein</td></tr>
    <tr><td>Water</td><td>350g</td><td>70% hydration</td></tr>
    <tr><td>Starter</td><td>100g</td><td>100% hydration</td></tr>
    <tr><td>Salt</td><td>10g</td><td>2% of flour</td></tr>
    <tr><td>Olive oil</td><td>15g</td><td>Plus more for pan</td></tr>
  </tbody>
</table>`,
  },
  {
    id: "timeline",
    label: "Project timeline",
    category: "Planning",
    html: `<div class="section-h">Q2 launch timeline</div>
<div class="timeline">
  <div class="tl-item done"><div class="tl-dot"></div><div class="tl-body"><strong>Week 1–2</strong> — Design system + API schema</div></div>
  <div class="tl-item done"><div class="tl-dot"></div><div class="tl-body"><strong>Week 3–4</strong> — Auth + core CRUD</div></div>
  <div class="tl-item active"><div class="tl-dot"></div><div class="tl-body"><strong>Week 5–6</strong> — Streaming UI + billing <span class="badge yellow">in progress</span></div></div>
  <div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><strong>Week 7</strong> — QA + load testing</div></div>
  <div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><strong>Week 8</strong> — Launch 🚀</div></div>
</div>
<table class="rt">
  <thead><tr><th>Milestone</th><th>Owner</th><th>Due</th><th>Risk</th></tr></thead>
  <tbody>
    <tr><td>Stripe integration</td><td>@sara</td><td>May 28</td><td><span class="badge yellow">medium</span></td></tr>
    <tr><td>StreamHtml renderer</td><td>@you</td><td>May 24</td><td><span class="badge green">low</span></td></tr>
    <tr><td>Load test 10k RPS</td><td>@devops</td><td>Jun 2</td><td><span class="badge red">high</span></td></tr>
  </tbody>
</table>`,
  },
  {
    id: "quiz",
    label: "Knowledge check",
    category: "Education",
    html: `<div class="section-h">JavaScript closures — quick check</div>
<div class="quiz">
  <div class="quiz-q"><span class="quiz-n">1</span> What does a closure capture?</div>
  <div class="quiz-a correct">The lexical environment of its outer function — variables, not just values at call time.</div>
  <div class="quiz-q"><span class="quiz-n">2</span> What's the classic loop + var gotcha?</div>
  <div class="quiz-a">All callbacks share one <code>i</code> binding — use <code>let</code> or IIFE.</div>
  <div class="quiz-q"><span class="quiz-n">3</span> Is this a closure?</div>
  <pre><code>function makeAdder(x) {
  return (y) => x + y;
}</code></pre>
  <div class="quiz-a correct">Yes — the returned arrow function closes over <code>x</code>.</div>
</div>`,
  },
  {
    id: "weather",
    label: "Weather forecast",
    category: "Data",
    html: `<div class="metrics">
  <div class="metric good"><div class="metric-val">72°F</div><div class="metric-lbl">now · SF</div></div>
  <div class="metric warn"><div class="metric-val">40%</div><div class="metric-lbl">rain chance</div></div>
  <div class="metric good"><div class="metric-val">8 mph</div><div class="metric-lbl">wind</div></div>
  <div class="metric good"><div class="metric-val">UV 6</div><div class="metric-lbl">high</div></div>
</div>
<table class="rt">
  <thead><tr><th>Day</th><th>High</th><th>Low</th><th>Conditions</th><th>Wind</th></tr></thead>
  <tbody>
    <tr><td>Today</td><td>72°</td><td>58°</td><td>☀️ Sunny</td><td>8 mph</td></tr>
    <tr><td>Sat</td><td>68°</td><td>55°</td><td>⛅ Partly cloudy</td><td>12 mph</td></tr>
    <tr><td>Sun</td><td>63°</td><td>52°</td><td>🌧️ Light rain</td><td>15 mph</td></tr>
    <tr><td>Mon</td><td>65°</td><td>53°</td><td>☀️ Sunny</td><td>6 mph</td></tr>
    <tr><td>Tue</td><td>70°</td><td>56°</td><td>☀️ Sunny</td><td>5 mph</td></tr>
  </tbody>
</table>
<div class="callout info">Sunday rain likely after 2pm — plan outdoor events for Saturday.</div>`,
  },
  {
    id: "pros-cons",
    label: "Build vs buy analysis",
    category: "Analysis",
    html: `<div class="section-h">Auth provider decision</div>
<table class="rt">
  <thead><tr><th>Criteria</th><th>Build (custom)</th><th>Buy (Clerk)</th></tr></thead>
  <tbody>
    <tr><td>Time to ship</td><td>6–8 weeks</td><td>2–3 days</td></tr>
    <tr><td>Maintenance burden</td><td><span class="badge red">high</span></td><td><span class="badge green">low</span></td></tr>
    <tr><td>SSO / SAML</td><td>4+ weeks extra</td><td>Built-in</td></tr>
    <tr><td>Cost at 10k MAU</td><td>~$800/mo infra</td><td>~$250/mo</td></tr>
    <tr><td>Compliance (SOC2)</td><td>Your audit scope</td><td>Vendor handles</td></tr>
  </tbody>
</table>
<div class="callout success"><strong>Recommendation:</strong> Buy for MVP, revisit custom auth if you hit 100k+ MAU with unique compliance needs.</div>`,
  },
  {
    id: "latex",
    label: "LaTeX & math formulas",
    category: "Education",
    html: `<div class="section-h">Beautiful identities</div>
<div class="callout info">Pure HTML with <code>data-latex</code> attributes — KaTeX typesets each formula as it streams in.</div>
<div class="math-block" data-latex="e^{i\\pi} + 1 = 0"></div>
<p class="math-caption">Euler's identity — five fundamental constants in one equation.</p>
<div class="section-h">Quadratic formula</div>
<p>For <span class="math-inline" data-latex="ax^2 + bx + c = 0"></span> with <span class="math-inline" data-latex="a \\neq 0"></span>:</p>
<div class="math-block" data-latex="x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"></div>
<div class="section-h">Calculus</div>
<p>The Gaussian integral:</p>
<div class="math-block" data-latex="\\int_{-\\infty}^{\\infty} e^{-x^2}\\, dx = \\sqrt{\\pi}"></div>
<p>Derivative via the limit definition:</p>
<div class="math-block" data-latex="f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}"></div>
<div class="section-h">Linear algebra</div>
<div class="math-block" data-latex="\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}"></div>
<div class="section-h">Series &amp; probability</div>
<div class="math-block" data-latex="e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}"></div>
<p>Bayes' theorem: <span class="math-inline" data-latex="P(A|B) = \\frac{P(B|A)\\,P(A)}{P(B)}"></span></p>
<table class="rt">
  <thead><tr><th>Formula</th><th>Name</th><th>Domain</th></tr></thead>
  <tbody>
    <tr><td><span class="math-inline" data-latex="\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}"></span></td><td>Gauss's law</td><td>Electromagnetism</td></tr>
    <tr><td><span class="math-inline" data-latex="E = mc^2"></span></td><td>Mass–energy</td><td>Relativity</td></tr>
    <tr><td><span class="math-inline" data-latex="i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi"></span></td><td>Schrödinger eq.</td><td>Quantum mechanics</td></tr>
    <tr><td><span class="math-inline" data-latex="\\sigma^2 = \\mathbb{E}[X^2] - (\\mathbb{E}[X])^2"></span></td><td>Variance</td><td>Statistics</td></tr>
  </tbody>
</table>
<div class="callout success"><strong>Prompt tip:</strong> Tell the model to use <code>&lt;span class="math-inline" data-latex="..."&gt;&lt;/span&gt;</code> for inline math and <code>&lt;div class="math-block" data-latex="..."&gt;&lt;/div&gt;</code> for display equations.</div>`,
  },
  {
    id: "error-log",
    label: "Error log summary",
    category: "Dashboards",
    html: `<div class="callout error"><strong>Spike detected</strong> — 847 errors in the last hour (baseline: ~40/hr).</div>
<table class="rt">
  <thead><tr><th>Error</th><th>Count</th><th>First seen</th><th>Service</th></tr></thead>
  <tbody>
    <tr><td><code>ConnectionTimeout</code></td><td>412</td><td>14:02 UTC</td><td>api-gateway</td></tr>
    <tr><td><code>RedisConnectionRefused</code></td><td>298</td><td>14:03 UTC</td><td>cache-worker</td></tr>
    <tr><td><code>ValidationError: email</code></td><td>89</td><td>13:45 UTC</td><td>signup-api</td></tr>
    <tr><td><code>RateLimitExceeded</code></td><td>48</td><td>14:10 UTC</td><td>api-gateway</td></tr>
  </tbody>
</table>
<div class="section-h">Suggested actions</div>
<ul>
  <li>Check Redis cluster health in <code>us-east-1</code></li>
  <li>Review connection pool settings on api-gateway</li>
  <li>Validation errors likely unrelated — separate incident</li>
</ul>`,
  },
  {
    id: "claude-interactive",
    label: "Interactive state trap",
    category: "Claude",
    html: INTERACTIVE_STATE_TRAP,
  },
  {
    id: "claude-spanning-table",
    label: "Colspan / rowspan table",
    category: "Claude",
    html: SPANNING_TABLE,
  },
  {
    id: "claude-bezier-svg",
    label: "Bezier SVG path",
    category: "Claude",
    html: BEZIER_SVG,
  },
  {
    id: "claude-deep-nest",
    label: "Deep nesting hell",
    category: "Claude",
    html: DEEP_NESTING,
  },
  {
    id: "claude-malformed",
    label: "Malformed HTML soup",
    category: "Claude",
    html: MALFORMED_SOUP,
  },
  {
    id: "claude-attributes",
    label: "Mid-attribute fracture",
    category: "Claude",
    html: ATTRIBUTE_FRACTURE,
  },
  {
    id: "claude-counters",
    label: "Ordered list counters",
    category: "Claude",
    html: ORDERED_COUNTERS,
  },
  {
    id: "claude-nested-table",
    label: "Table + callout interleave",
    category: "Claude",
    html: NESTED_TABLE_CALLOUT,
  },
  {
    id: "claude-giant-pre",
    label: "Giant pre block (8k chars)",
    category: "Claude",
    html: GIANT_PRE,
  },
  {
    id: "claude-perf-bomb",
    label: "Performance bomb (120 metrics)",
    category: "Claude",
    html: PERF_BOMB,
  },
];

export const CATEGORIES = [
  "Showcase",
  ...[...new Set(EXAMPLES.map((e) => e.category))].filter(
    (c) => c !== "Showcase",
  ),
];
