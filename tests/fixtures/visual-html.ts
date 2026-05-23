/** Realistic AI-generated visual HTML fixtures for stress tests */

export const METRICS_DASHBOARD = `<div class="metrics">
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
</div>`;

export const SVG_BAR_CHART = `<div class="chart-wrap">
  <div class="section-h">Revenue by quarter</div>
  <svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bar chart">
    <rect x="0" y="0" width="400" height="220" fill="#fafaf8"/>
    <text x="200" y="24" text-anchor="middle" font-size="14" fill="#666">FY 2025</text>
    <rect x="40" y="80" width="60" height="120" fill="#3b82f6" rx="4"/>
    <rect x="120" y="50" width="60" height="150" fill="#3b82f6" rx="4"/>
    <rect x="200" y="65" width="60" height="135" fill="#3b82f6" rx="4"/>
    <rect x="280" y="40" width="60" height="160" fill="#16a34a" rx="4"/>
    <text x="70" y="215" text-anchor="middle" font-size="11" fill="#888">Q1</text>
    <text x="150" y="215" text-anchor="middle" font-size="11" fill="#888">Q2</text>
    <text x="230" y="215" text-anchor="middle" font-size="11" fill="#888">Q3</text>
    <text x="310" y="215" text-anchor="middle" font-size="11" fill="#888">Q4</text>
  </svg>
</div>`;

export const SVG_LINE_CHART = `<div class="chart-wrap">
  <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg">
    <polyline points="20,150 80,120 140,90 200,110 260,60 320,40" fill="none" stroke="#3b82f6" stroke-width="2"/>
    <circle cx="20" cy="150" r="4" fill="#3b82f6"/>
    <circle cx="320" cy="40" r="4" fill="#16a34a"/>
    <path d="M20 160 H340" stroke="#e5e7eb" stroke-width="1"/>
    <path d="M20 20 V160" stroke="#e5e7eb" stroke-width="1"/>
  </svg>
</div>`;

export const CSS_DONUT_CHART = `<div class="donut-row">
  <div class="donut" style="background: conic-gradient(#3b82f6 0 65%, #e5e7eb 65% 100%); width:120px; height:120px; border-radius:50%"></div>
  <div class="donut-legend">
    <div class="legend-item"><span class="dot" style="background:#3b82f6"></span>Desktop 65%</div>
    <div class="legend-item"><span class="dot" style="background:#e5e7eb"></span>Mobile 35%</div>
  </div>
</div>`;

export const COMPARISON_GRID = `<div class="cmp-grid">
  <div class="cmp-col">
    <div class="cmp-hdr react">React</div>
    <div class="cmp-row"><span class="ck">✓</span>Largest ecosystem</div>
    <div class="cmp-row"><span class="cx">✗</span>Verbose JSX</div>
  </div>
  <div class="cmp-col">
    <div class="cmp-hdr vue">Vue</div>
    <div class="cmp-row"><span class="ck">✓</span>Gentle learning curve</div>
    <div class="cmp-row"><span class="cx">✗</span>Smaller job market</div>
  </div>
</div>`;

export const CODE_DIFF = `<div class="diff">
  <div class="diff-hdr">auth.ts</div>
  <div class="diff-rem">- const token = req.headers['x-token'];</div>
  <div class="diff-add">+ const token = req.headers.authorization?.split(' ')[1];</div>
  <div class="diff-add">+ if (!token) return res.status(401);</div>
</div>`;

export const TIMELINE = `<div class="timeline">
  <div class="tl-item done"><div class="tl-dot"></div><div class="tl-body"><strong>Week 1</strong> — Design</div></div>
  <div class="tl-item active"><div class="tl-dot"></div><div class="tl-body"><strong>Week 2</strong> — Build <span class="badge yellow">active</span></div></div>
  <div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><strong>Week 3</strong> — Launch</div></div>
</div>`;

export const LATEX_HEAVY = `<div class="section-h">Identities</div>
<div class="math-block" data-latex="e^{i\\pi} + 1 = 0"></div>
<div class="math-block" data-latex="\\int_{-\\infty}^{\\infty} e^{-x^2}\\, dx = \\sqrt{\\pi}"></div>
<p>Inline: <span class="math-inline" data-latex="\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}"></span></p>`;

export const DATA_TABLE = `<table class="rt">
  <thead><tr><th>Region</th><th>Users</th><th>Revenue</th><th>Churn</th></tr></thead>
  <tbody>
    <tr><td>NA</td><td>48,200</td><td>$1.2M</td><td>2.1%</td></tr>
    <tr><td>EU</td><td>31,400</td><td>$890K</td><td>1.8%</td></tr>
    <tr><td>APAC</td><td>22,100</td><td>$640K</td><td>3.4%</td></tr>
    <tr><td>LATAM</td><td>9,800</td><td>$210K</td><td>4.2%</td></tr>
  </tbody>
</table>`;

export const FULL_DASHBOARD = `${METRICS_DASHBOARD}
<div class="callout warn"><strong>Alert:</strong> p99 spiked on <code>/api/reports</code></div>
${SVG_BAR_CHART}
${DATA_TABLE}
<div class="callout info">Recommend read replica for reporting queries.</div>`;

export const MESSY_LLM_NESTING = `<div><div><div><span><strong>Bold <em>and <u>nested</u></em></strong></span></div></div></div>
<div class="metrics"><div class="metric"><div class="val">1</div></div></div>`;

export const SVG_WITH_SCRIPT_INJECTION = `<div class="chart">
  <svg viewBox="0 0 100 100"><rect width="100" height="100" fill="blue"/></svg>
  <script>alert('xss')</script>
  <img src="x" onerror="alert(1)"/>
</div>`;

export const ALL_FIXTURES = {
  METRICS_DASHBOARD,
  SVG_BAR_CHART,
  SVG_LINE_CHART,
  CSS_DONUT_CHART,
  COMPARISON_GRID,
  CODE_DIFF,
  TIMELINE,
  LATEX_HEAVY,
  DATA_TABLE,
  FULL_DASHBOARD,
  MESSY_LLM_NESTING,
} as const;
