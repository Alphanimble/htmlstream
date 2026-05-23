import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_STREAM_SCROLL_EASE,
  easeScrollToBottom,
} from "streamhtml";
import { StreamHtml } from "streamhtml";
import { CATEGORIES, EXAMPLES, type DemoExample } from "./examples";
import { renderMath } from "./render-math";

const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0 }
body { background: #eee; padding: 16px; font-family: system-ui, sans-serif }
.app { display: flex; flex-direction: column; height: calc(100vh - 32px); max-width: 1280px; margin: 0 auto; background: #f7f7f5; border: 1px solid #e5e5e3; border-radius: 12px; overflow: hidden; font-size: 13.5px; color: #1a1a18 }
.hdr { display: flex; align-items: center; gap: 9px; padding: 10px 16px; background: #fff; border-bottom: 1px solid #e5e5e3; flex-shrink: 0 }
.hdr-title { font-weight: 500 }
.hdr-sub { font-size: 11px; color: #aaa; border: 1px solid #e5e5e3; padding: 2px 8px; border-radius: 100px }
.body { display: flex; flex: 1; min-height: 0 }
.sidebar { flex-shrink: 0; display: flex; flex-direction: column; background: #fff; overflow: hidden }
.sidebar-left { width: 240px; border-right: 1px solid #e5e5e3 }
.sidebar-right { width: 280px; border-left: 1px solid #e5e5e3 }
.sidebar-hdr { padding: 12px 14px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #bbb; border-bottom: 1px solid #f0f0ee; flex-shrink: 0 }
.sidebar-body { flex: 1; overflow-y: auto; padding: 12px 14px }
.main { flex: 1; min-width: 0; display: flex; flex-direction: column; background: #f7f7f5 }
.msgs { flex: 1; overflow-y: auto; overflow-anchor: none; padding: 16px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: auto }
.msg-user { align-self: flex-end; background: #f0f0ee; border: 1px solid #e5e5e3; border-radius: 10px; padding: 7px 12px; color: #555; max-width: 85% }
.msg-ai { align-self: flex-start; background: #fff; border: 1px solid #e5e5e3; border-radius: 10px; padding: 13px 15px; width: 100% }
.stream-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px }
.stream-field label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #999; display: flex; justify-content: space-between }
.stream-field label output { color: #555; font-variant-numeric: tabular-nums; text-transform: none; letter-spacing: 0 }
.stream-field input[type=range] { width: 100%; accent-color: #1a1a18 }
.stream-presets { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 14px }
.stream-presets button { font-size: 11px; padding: 4px 8px; border-radius: 6px; border: 1px solid #e0e0de; background: #fafaf8; color: #555; cursor: pointer; font-family: inherit }
.stream-presets button:hover { background: #f0f0ee }
.stream-presets button.active { background: #eff6ff; border-color: #93c5fd; color: #1e40af }
.stream-stats { font-size: 11px; color: #888; font-variant-numeric: tabular-nums; padding: 10px; background: #fafaf8; border-radius: 8px; border: 1px solid #f0f0ee; line-height: 1.5; margin-bottom: 12px }
.stream-stats strong { color: #555; font-weight: 500 }
.btn-stop { width: 100%; font-size: 12px; padding: 8px; border-radius: 8px; border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; cursor: pointer; font-family: inherit; font-weight: 500 }
.btn-stop:hover { background: #fee2e2 }
.cat-tabs { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px }
.cat-tabs button { font-size: 10px; padding: 3px 8px; border-radius: 100px; border: 1px solid #e0e0de; background: #fafaf8; color: #666; cursor: pointer; font-family: inherit }
.cat-tabs button.active { background: #1a1a18; color: #fff; border-color: #1a1a18 }
.ex-list { display: flex; flex-direction: column; gap: 6px }
.ex-list button { font-size: 12px; padding: 9px 10px; border-radius: 8px; border: 1px solid #e5e5e3; background: #fafaf8; color: #555; cursor: pointer; font-family: inherit; text-align: left; line-height: 1.35 }
.ex-list button:hover:not(:disabled) { background: #f0f0ee; color: #1a1a18; border-color: #d5d5d3 }
.ex-list button:disabled { opacity: .35; cursor: not-allowed }
.ex-list button.active-ex { border-color: #93c5fd; background: #eff6ff }
.btn-cat { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #aaa; margin-bottom: 2px }
.empty-main { flex: 1; display: flex; align-items: center; justify-content: center; color: #bbb; font-size: 13px; padding: 24px; text-align: center; line-height: 1.6 }
@media (max-width: 900px) {
  body { padding: 0 }
  .app { height: 100vh; max-width: none; border-radius: 0; border: none }
  .body { flex-direction: column }
  .sidebar-left, .sidebar-right { width: 100%; max-height: 28vh; border: none; border-bottom: 1px solid #e5e5e3 }
  .sidebar-right { border-left: none }
  .main { min-height: 40vh }
}
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-bottom: 13px }
@media (max-width: 600px) { .metrics { grid-template-columns: repeat(2, 1fr) } }
.metric { padding: 11px 13px; border-radius: 8px; border: 1px solid }
.metric.good { background: #f0fdf4; border-color: #bbf7d0 }
.metric.warn { background: #fffbeb; border-color: #fde68a }
.metric.bad { background: #fef2f2; border-color: #fecaca }
.metric-val { font-size: 21px; font-weight: 500; line-height: 1.1 }
.metric.good .metric-val { color: #15803d }
.metric.warn .metric-val { color: #92400e }
.metric.bad .metric-val { color: #b91c1c }
.metric-lbl { font-size: 10.5px; color: #888; margin-top: 3px; text-transform: uppercase }
.bar-wrap { height: 3px; background: #e5e7eb; border-radius: 2px; margin-top: 9px; overflow: hidden }
.bar-fill { height: 100%; border-radius: 2px }
.bar-fill.good { background: #16a34a }
.bar-fill.warn { background: #d97706 }
.bar-fill.bad { background: #dc2626 }
.callout { padding: 10px 13px; border-radius: 7px; font-size: 13px; margin-bottom: 12px; border-left: 3px solid; line-height: 1.55 }
.callout.warn { background: #fffbeb; border-color: #d97706; color: #78350f }
.callout.info { background: #eff6ff; border-color: #3b82f6; color: #1e3a5f }
.callout.success { background: #f0fdf4; border-color: #16a34a; color: #14532d }
.callout.error { background: #fef2f2; border-color: #dc2626; color: #7f1d1d }
.rt { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 12px; table-layout: fixed }
.rt th { padding: 7px 10px; text-align: left; font-weight: 500; font-size: 10.5px; text-transform: uppercase; color: #999; border-bottom: 1px solid #e5e7eb }
.rt td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; overflow: hidden; text-overflow: ellipsis }
.badge { display: inline-block; font-size: 10.5px; padding: 2px 8px; border-radius: 100px; font-weight: 500; white-space: nowrap }
.badge.green { background: #dcfce7; color: #166534 }
.badge.yellow { background: #fef9c3; color: #854d0e }
.badge.red { background: #fee2e2; color: #991b1b }
.badge.blue { background: #dbeafe; color: #1e40af }
.section-h { font-size: 10.5px; font-weight: 500; text-transform: uppercase; color: #bbb; margin: 13px 0 8px }
.cmp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-bottom: 12px }
.cmp-col { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden }
.cmp-hdr { padding: 9px 12px; font-size: 13px; font-weight: 500 }
.cmp-hdr.react { background: #dbeafe; color: #1e40af }
.cmp-hdr.vue { background: #dcfce7; color: #166534 }
.cmp-row { display: flex; gap: 8px; padding: 6px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12.5px }
.cmp-row:last-child { border-bottom: none }
.ck { color: #16a34a; flex-shrink: 0 }
.cx { color: #dc2626; flex-shrink: 0 }
.td { color: #d97706; flex-shrink: 0 }
.diff { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; font-family: ui-monospace, monospace; font-size: 12px; margin-bottom: 12px }
.diff-hdr { padding: 8px 12px; background: #f9f9f8; border-bottom: 1px solid #e5e7eb; font-size: 11.5px; color: #888 }
.diff-sec { padding: 3px 12px; background: #eff6ff; color: #3b82f6; font-size: 11px }
.diff-ctx { padding: 2px 12px; color: #888 }
.diff-rem { padding: 2px 12px; background: #fef2f2; color: #b91c1c }
.diff-add { padding: 2px 12px; background: #f0fdf4; color: #15803d }
.timeline { margin-bottom: 12px; padding-left: 4px }
.tl-item { display: flex; gap: 12px; padding: 8px 0; position: relative }
.tl-item:not(:last-child)::before { content: ''; position: absolute; left: 5px; top: 22px; bottom: -8px; width: 2px; background: #e5e7eb }
.tl-dot { width: 12px; height: 12px; border-radius: 50%; background: #e5e7eb; flex-shrink: 0; margin-top: 3px }
.tl-item.done .tl-dot { background: #16a34a }
.tl-item.active .tl-dot { background: #3b82f6; box-shadow: 0 0 0 3px #dbeafe }
.tl-body { font-size: 13px; line-height: 1.5 }
.quiz { margin-bottom: 12px }
.quiz-q { display: flex; gap: 10px; font-weight: 500; margin: 12px 0 6px; align-items: flex-start }
.quiz-n { background: #1a1a18; color: #fff; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0 }
.quiz-a { padding: 8px 12px; background: #f5f5f3; border-radius: 6px; font-size: 13px; margin-bottom: 4px }
.quiz-a.correct { background: #f0fdf4; border-left: 3px solid #16a34a }
.steps { padding-left: 1.4em; margin: 8px 0 12px; line-height: 1.7 }
.muted { color: #888; font-size: 12px; margin-bottom: 10px }
h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px }
.math-block { margin: 12px 0; padding: 12px; background: #fafaf8; border: 1px solid #f0f0ee; border-radius: 8px; overflow-x: auto; text-align: center }
.math-inline { white-space: nowrap }
.math-caption { font-size: 12px; color: #888; text-align: center; margin: -4px 0 12px; font-style: italic }
.katex { font-size: 1.05em }
.katex-display { margin: 0 }
.chart-wrap { margin-bottom: 12px }
.chart-wrap svg { display: block; width: 100%; max-width: 100%; height: auto; border: 1px solid #f0f0ee; border-radius: 8px; background: #fafaf8 }
.sh-streaming .chart-wrap svg { min-height: 180px }
.chart-legend { display: flex; gap: 16px; font-size: 12px; color: #666; margin-bottom: 12px; flex-wrap: wrap }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: middle }
.donut-row { display: flex; align-items: center; gap: 20px; margin-bottom: 12px; flex-wrap: wrap }
.donut { flex-shrink: 0; position: relative }
.donut::after { content: ''; position: absolute; inset: 22%; background: #fff; border-radius: 50% }
.donut-legend { display: flex; flex-direction: column; gap: 8px; font-size: 13px }
.legend-item { display: flex; align-items: center; gap: 8px }
.legend-item .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0 }
.sh-streaming .math-block[data-latex]:empty,
.sh-streaming [data-katex-placeholder] { min-height: 2.75em }
details { margin-bottom: 12px; padding: 10px 13px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafaf8 }
details[open] { background: #fff }
summary { cursor: pointer; font-weight: 500; font-size: 13px }
details p { margin-top: 8px; font-size: 13px; line-height: 1.55; color: #555 }
.stream-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff }
.stream-form label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #666 }
.stream-form input, .stream-form textarea { font: inherit; font-size: 13px; padding: 8px 10px; border: 1px solid #e0e0de; border-radius: 6px; background: #fff }
.stream-form button { align-self: flex-start; font: inherit; font-size: 12px; padding: 6px 12px; border-radius: 6px; border: 1px solid #e0e0de; background: #fafaf8; cursor: pointer }
pre.code-block { font-family: ui-monospace, monospace; font-size: 11px; line-height: 1.45; padding: 12px; background: #1a1a18; color: #e5e5e3; border-radius: 8px; overflow: auto; max-height: 320px; margin-bottom: 12px }
.counter-list { padding-left: 1.5em; margin: 8px 0 12px; line-height: 1.7 }
.counter-list li { margin: 4px 0 }
.metrics.perf-grid { padding-right: 4px }
`;

interface StreamParams {
  chunkSize: number;
  intervalMs: number;
  jitterMs: number;
}

interface StreamPreset {
  id: string;
  label: string;
  chunkSize: number;
  intervalMs: number;
  jitterMs: number;
}

const STREAM_PRESETS: StreamPreset[] = [
  { id: "char", label: "Char", chunkSize: 1, intervalMs: 35, jitterMs: 8 },
  { id: "word", label: "Word", chunkSize: 6, intervalMs: 45, jitterMs: 12 },
  { id: "token", label: "Token", chunkSize: 4, intervalMs: 28, jitterMs: 6 },
  { id: "normal", label: "Normal", chunkSize: 14, intervalMs: 18, jitterMs: 0 },
  { id: "fast", label: "Fast", chunkSize: 32, intervalMs: 10, jitterMs: 0 },
  { id: "turbo", label: "Turbo", chunkSize: 80, intervalMs: 6, jitterMs: 0 },
];

const DEFAULT_PRESET = "normal";

function calcThroughput(chunkSize: number, intervalMs: number): number {
  if (intervalMs <= 0) return 0;
  return Math.round((chunkSize / intervalMs) * 1000);
}

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  done: boolean;
}

function settleScrollBottom(
  container: HTMLElement | null,
  userScrolledUp: { current: boolean },
) {
  if (!container || userScrolledUp.current) {
    return;
  }
  const distanceFromBottom =
    container.scrollHeight - container.scrollTop - container.clientHeight;
  if (distanceFromBottom < 120) {
    easeScrollToBottom(container, 0.35);
  }
}

export default function App() {
  const [msgs, setMsgs] = useState<Message[]>([
    {
      id: "init",
      role: "ai",
      done: true,
      content:
        '<div class="callout info"><strong>27 examples</strong> on the right — start with <strong>★ Ultimate showcase</strong> under Showcase, or browse <strong>Claude</strong> edge cases. Tune speed on the left.</div>',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<string>("Showcase");
  const [activeExId, setActiveExId] = useState<string | null>(null);
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [chunkSize, setChunkSize] = useState(14);
  const [intervalMs, setIntervalMs] = useState(18);
  const [jitterMs, setJitterMs] = useState(0);
  const [streamProgress, setStreamProgress] = useState<{ cur: number; total: number } | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const streamParams = useRef<StreamParams>({ chunkSize, intervalMs, jitterMs });

  streamParams.current = { chunkSize, intervalMs, jitterMs };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    const el = msgsRef.current;
    if (!el) {
      return;
    }
    let touchStartY = 0;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        userScrolledUpRef.current = true;
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      if (y > touchStartY + 12) {
        userScrolledUpRef.current = true;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  useEffect(() => {
    if (!busy) {
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = msgsRef.current;
      if (el && !userScrolledUpRef.current) {
        easeScrollToBottom(el, DEFAULT_STREAM_SCROLL_EASE);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [busy]);

  useEffect(() => {
    if (busy) {
      return;
    }
    requestAnimationFrame(() => {
      settleScrollBottom(msgsRef.current, userScrolledUpRef);
    });
  }, [msgs, busy]);

  useLayoutEffect(() => {
    msgsRef.current?.querySelectorAll(".msg-ai").forEach((el) => {
      renderMath(el as HTMLElement, busy);
    });
  }, [msgs, busy]);

  const applyPreset = useCallback((p: StreamPreset) => {
    setPreset(p.id);
    setChunkSize(p.chunkSize);
    setIntervalMs(p.intervalMs);
    setJitterMs(p.jitterMs);
  }, []);

  const stopStream = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
    setStreamProgress(null);
  }, []);

  const filtered =
    category === "All"
      ? EXAMPLES
      : EXAMPLES.filter((e) => e.category === category);

  const ask = useCallback(
    (example: DemoExample) => {
      if (busy) return;
      userScrolledUpRef.current = false;
      setActiveExId(example.id);
      const uid = `u${Date.now()}`;
      const aid = `a${Date.now()}`;
      setMsgs((p) => [
        ...p,
        { id: uid, role: "user", done: true, content: example.label },
        { id: aid, role: "ai", done: false, content: "" },
      ]);
      setBusy(true);
      setStreamProgress({ cur: 0, total: example.html.length });

      let i = 0;
      const tick = () => {
        const { chunkSize: cs, intervalMs: iv, jitterMs: jt } = streamParams.current;
        i = Math.min(i + cs, example.html.length);
        const done = i >= example.html.length;

        setMsgs((p) =>
          p.map((m) =>
            m.id === aid
              ? { ...m, content: done ? example.html : example.html.slice(0, i), done }
              : m,
          ),
        );
        setStreamProgress({ cur: i, total: example.html.length });

        if (done) {
          timer.current = null;
          setBusy(false);
          setStreamProgress(null);
          return;
        }

        const jitter = jt > 0 ? Math.floor(Math.random() * (jt * 2 + 1)) - jt : 0;
        timer.current = setTimeout(tick, Math.max(1, iv + jitter));
      };

      timer.current = setTimeout(tick, intervalMs);
    },
    [busy, intervalMs],
  );

  const throughput = calcThroughput(chunkSize, intervalMs);
  const etaSec =
    streamProgress && throughput > 0
      ? Math.ceil((streamProgress.total - streamProgress.cur) / throughput)
      : null;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="hdr">
          <span className="hdr-title">StreamHtml</span>
          <span className="hdr-sub">streaming HTML renderer</span>
          <a href="/chat/" style={{ marginLeft: "auto", fontSize: 12, color: "#666", textDecoration: "none" }}>Live chat →</a>
        </div>

        <div className="body">
          {/* Left — stream controls */}
          <aside className="sidebar sidebar-left">
            <div className="sidebar-hdr">Stream settings</div>
            <div className="sidebar-body">
              <div className="stream-presets">
                {STREAM_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={preset === p.id ? "active" : ""}
                    onClick={() => applyPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="stream-field">
                <label htmlFor="chunk-size">
                  Chunk size <output>{chunkSize} chars</output>
                </label>
                <input
                  id="chunk-size"
                  type="range"
                  min={1}
                  max={120}
                  step={1}
                  value={chunkSize}
                  onChange={(e) => {
                    setPreset("custom");
                    setChunkSize(Number(e.target.value));
                  }}
                />
              </div>

              <div className="stream-field">
                <label htmlFor="interval-ms">
                  Interval <output>{intervalMs} ms</output>
                </label>
                <input
                  id="interval-ms"
                  type="range"
                  min={1}
                  max={200}
                  step={1}
                  value={intervalMs}
                  onChange={(e) => {
                    setPreset("custom");
                    setIntervalMs(Number(e.target.value));
                  }}
                />
              </div>

              <div className="stream-field">
                <label htmlFor="jitter-ms">
                  Jitter <output>±{jitterMs} ms</output>
                </label>
                <input
                  id="jitter-ms"
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={jitterMs}
                  onChange={(e) => {
                    setPreset("custom");
                    setJitterMs(Number(e.target.value));
                  }}
                />
              </div>

              <div className="stream-field">
                <label>
                  Throughput <output>{throughput} chars/s</output>
                </label>
                <input
                  type="range"
                  min={50}
                  max={4000}
                  step={50}
                  value={throughput}
                  onChange={(e) => {
                    setPreset("custom");
                    const tp = Number(e.target.value);
                    setIntervalMs(Math.max(1, Math.round((chunkSize / tp) * 1000)));
                  }}
                />
              </div>

              <div className="stream-stats">
                {streamProgress ? (
                  <>
                    <strong>{streamProgress.cur.toLocaleString()}</strong> /{" "}
                    {streamProgress.total.toLocaleString()} chars
                    {etaSec !== null && etaSec > 0 && <> · ~{etaSec}s left</>}
                    <br />
                    {chunkSize} chars / {intervalMs}ms
                    {jitterMs > 0 && <> ±{jitterMs}ms</>}
                  </>
                ) : (
                  <>
                    ~<strong>{throughput}</strong> chars/s
                    <br />
                    {chunkSize} chars · {intervalMs}ms interval
                    {jitterMs > 0 && <> · ±{jitterMs}ms jitter</>}
                    <br />
                    {busy ? "Adjust sliders live" : "Ready to stream"}
                  </>
                )}
              </div>

              {busy && (
                <button type="button" className="btn-stop" onClick={stopStream}>
                  Stop stream
                </button>
              )}
            </div>
          </aside>

          {/* Center — streaming output only */}
          <main className="main">
            <div className="msgs" ref={msgsRef}>
              {msgs.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="msg-user">
                    {m.content}
                  </div>
                ) : (
                  <div key={m.id} className="msg-ai">
                    <StreamHtml key={m.id} isStreaming={!m.done}>
                      {m.content}
                    </StreamHtml>
                  </div>
                ),
              )}
            </div>
          </main>

          {/* Right — examples */}
          <aside className="sidebar sidebar-right">
            <div className="sidebar-hdr">Examples · {filtered.length}</div>
            <div className="sidebar-body">
              <div className="cat-tabs">
                <button
                  type="button"
                  className={category === "All" ? "active" : ""}
                  onClick={() => setCategory("All")}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={category === cat ? "active" : ""}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="ex-list">
                {filtered.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    className={activeExId === ex.id && busy ? "active-ex" : ""}
                    onClick={() => ask(ex)}
                    disabled={busy}
                  >
                    <span className="btn-cat">{ex.category}</span>
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
