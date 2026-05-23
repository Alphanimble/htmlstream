import {
  bindStreamScrollFollow,
  createStreamScrollFollow,
  resetStreamScrollFollow,
  tickStreamScrollFollow,
  HtmlStream,
  readStreamParts,
  type StreamPart,
} from "streamhtml";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { SessionSidebar, type ReplaySettings } from "./SessionSidebar";
import { listSessions, loadSessionById } from "./session-api";
import {
  type ChatMessage,
  type ChatSession,
  clearLocalSession,
  createSession,
  loadLocalSession,
  loadServerSession,
  saveLocalSession,
  saveServerSession,
} from "./session";
import {
  attachStreamActions,
  enhanceStreamedContent,
} from "./stream-actions";
import { replayStream } from "./stream-replay";

function formatRawStream(reasoning: string, content: string): string {
  if (reasoning && content) {
    return `[thinking]\n${reasoning}\n\n[content]\n${content}`;
  }
  if (reasoning) {
    return `[thinking]\n${reasoning}`;
  }
  return content;
}

async function streamChat(
  messages: { role: string; content: string }[],
  onPart: (part: StreamPart) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const json = (await res.json()) as { error?: string };
      detail = json.error ?? detail;
    } catch {
      detail = (await res.text()) || detail;
    }
    throw new Error(detail);
  }

  if (!res.body) {
    throw new Error("No response stream");
  }

  await readStreamParts(res.body, onPart, signal);
}

function newMessage(
  role: ChatMessage["role"],
  content: string,
): ChatMessage {
  return {
    id: `${role[0]}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    at: new Date().toISOString(),
  };
}

export function ChatApp() {
  const [session, setSession] = useState<ChatSession>(() => createSession());
  const [sessionList, setSessionList] = useState<
    Awaited<ReturnType<typeof listSessions>>
  >([]);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [isReplay, setIsReplay] = useState(false);
  const [replaySlice, setReplaySlice] = useState<ChatMessage[] | null>(null);
  const [replayTargetId, setReplayTargetId] = useState<string | null>(null);
  const [replaySettings, setReplaySettings] = useState<ReplaySettings>({
    delayMs: 16,
    chunkSize: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const msgsRef = useRef<HTMLDivElement>(null);
  const btsRef = useRef<HTMLPreElement>(null);
  const rawTextRef = useRef("");
  const rawReasoningRef = useRef("");
  const rawContentRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const msgsScrollFollowRef = useRef(createStreamScrollFollow());
  const btsScrollFollowRef = useRef(createStreamScrollFollow());
  const saveTimerRef = useRef<number | null>(null);

  const [rawStats, setRawStats] = useState({ chars: 0, chunks: 0 });
  const [rawPreviewId, setRawPreviewId] = useState<string | null>(null);

  const streaming = busy || isReplay;

  const refreshSessions = useCallback(async () => {
    setSessionList(await listSessions());
  }, []);

  const paintRawStream = useCallback((reasoning: string, content: string) => {
    rawReasoningRef.current = reasoning;
    rawContentRef.current = content;
    rawTextRef.current = formatRawStream(reasoning, content);
    if (btsRef.current) {
      btsRef.current.textContent = rawTextRef.current;
    }
    setRawStats((prev) => ({
      ...prev,
      chars: rawTextRef.current.length,
    }));
  }, []);

  const appendStreamPart = useCallback((part: StreamPart) => {
    if (!part.delta) {
      return;
    }

    if (part.kind === "reasoning") {
      rawReasoningRef.current += part.delta;
    } else {
      rawContentRef.current += part.delta;
    }

    rawTextRef.current = formatRawStream(
      rawReasoningRef.current,
      rawContentRef.current,
    );

    if (btsRef.current) {
      btsRef.current.textContent = rawTextRef.current;
    }

    setRawStats((prev) => ({
      chars: rawTextRef.current.length,
      chunks: prev.chunks + 1,
    }));
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const local = loadLocalSession();
      if (local && !cancelled) {
        setSession(local);
        setHydrated(true);
        void refreshSessions();
        return;
      }

      const remote = await loadServerSession();
      if (!cancelled && remote) {
        setSession(remote);
        saveLocalSession(remote);
      }
      if (!cancelled) {
        void refreshSessions();
      }
      setHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSessions]);

  useEffect(() => {
    if (!hydrated || isReplay) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      const next = { ...session, updatedAt: new Date().toISOString() };
      saveLocalSession(next);
      void saveServerSession(next);
      void refreshSessions();
    }, 400);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [session, hydrated, isReplay, refreshSessions]);

  useEffect(() => {
    const el = msgsRef.current;
    if (!el) {
      return;
    }
    return bindStreamScrollFollow(el, msgsScrollFollowRef.current);
  }, []);

  useEffect(() => {
    const el = btsRef.current;
    if (!el) {
      return;
    }
    return bindStreamScrollFollow(el, btsScrollFollowRef.current);
  }, []);

  useEffect(() => attachStreamActions(msgsRef.current), []);

  const displayMessages = replaySlice ?? session.messages;

  useEffect(() => {
    const el = msgsRef.current;
    if (!el) {
      return;
    }
    const id = requestAnimationFrame(() => enhanceStreamedContent(el));
    return () => cancelAnimationFrame(id);
  }, [displayMessages, streaming]);

  useEffect(() => {
    if (!streaming) {
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = msgsRef.current;
      if (el) {
        tickStreamScrollFollow(el, msgsScrollFollowRef.current);
      }
      const bts = btsRef.current;
      if (bts) {
        tickStreamScrollFollow(bts, btsScrollFollowRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [streaming]);

  const selectSession = useCallback(
    async (id: string) => {
      if (streaming) {
        return;
      }
      if (id === session.id) {
        return;
      }
      const loaded = await loadSessionById(id);
      if (!loaded) {
        setError("Could not load session");
        return;
      }
      setError(null);
      setSession(loaded);
      saveLocalSession(loaded);
      setReplaySlice(null);
      setReplayTargetId(null);
      setRawPreviewId(null);
      paintRawStream("", "");
      setRawStats({ chars: 0, chunks: 0 });
      resetStreamScrollFollow(msgsScrollFollowRef.current);
      resetStreamScrollFollow(btsScrollFollowRef.current);
    },
    [paintRawStream, session.id, streaming],
  );

  const startNewChat = useCallback(() => {
    stopStreaming();
    clearLocalSession();
    void fetch("/api/session", { method: "DELETE" });
    const next = createSession();
    setSession(next);
    setError(null);
    setDraft("");
    setReplaySlice(null);
    setReplayTargetId(null);
    setRawPreviewId(null);
    setRawStats({ chars: 0, chunks: 0 });
    paintRawStream("", "");
    resetStreamScrollFollow(msgsScrollFollowRef.current);
    resetStreamScrollFollow(btsScrollFollowRef.current);
    setBusy(false);
    setIsReplay(false);
    void refreshSessions();
  }, [paintRawStream, refreshSessions, stopStreaming]);

  const runReplay = useCallback(async () => {
    if (!replayTargetId || streaming) {
      return;
    }

    const source = session.messages.find((m) => m.id === replayTargetId);
    if (!source?.content) {
      return;
    }

    const index = session.messages.findIndex((m) => m.id === replayTargetId);
    if (index === -1) {
      return;
    }

    setError(null);
    resetStreamScrollFollow(msgsScrollFollowRef.current);
    resetStreamScrollFollow(btsScrollFollowRef.current);
    setRawPreviewId(replayTargetId);
    setRawStats({ chars: 0, chunks: 0 });
    paintRawStream(source.reasoning ?? "", "");

    const prefix = session.messages.slice(0, index);
    setReplaySlice([
      ...prefix,
      { ...source, content: "", reasoning: source.reasoning ?? "" },
    ]);
    setIsReplay(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await replayStream(
        source.content,
        (chunk) => {
          appendStreamPart({ kind: "content", delta: chunk });
          setReplaySlice((prev) => {
            if (!prev) {
              return prev;
            }
            return prev.map((m) =>
              m.id === replayTargetId
                ? { ...m, content: m.content + chunk }
                : m,
            );
          });
        },
        { ...replaySettings, signal: controller.signal },
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Replay failed");
      }
    } finally {
      setIsReplay(false);
      setReplaySlice(null);
      abortRef.current = null;
      paintRawStream(source.reasoning ?? "", source.content);
      setRawStats((prev) => ({
        chars: formatRawStream(source.reasoning ?? "", source.content).length,
        chunks: prev.chunks,
      }));
    }
  }, [
    appendStreamPart,
    paintRawStream,
    replaySettings,
    replayTargetId,
    session.messages,
    streaming,
  ]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || streaming) {
      return;
    }

    setError(null);
    setDraft("");
    resetStreamScrollFollow(msgsScrollFollowRef.current);
    resetStreamScrollFollow(btsScrollFollowRef.current);

    const userMsg = newMessage("user", text);
    const assistantMsg = newMessage("assistant", "");
    const history = [...session.messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setRawPreviewId(assistantMsg.id);
    setRawStats({ chars: 0, chunks: 0 });
    paintRawStream("", "");

    setSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg, assistantMsg],
    }));
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        history,
        (part) => {
          appendStreamPart(part);
          setSession((prev) => ({
            ...prev,
            messages: prev.messages.map((m) => {
              if (m.id !== assistantMsg.id) {
                return m;
              }
              if (part.kind === "reasoning") {
                return {
                  ...m,
                  reasoning: (m.reasoning ?? "") + part.delta,
                };
              }
              return { ...m, content: m.content + part.delta };
            }),
          }));
        },
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }, [appendStreamPart, draft, paintRawStream, session.messages, streaming]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  const lastAssistant = [...displayMessages]
    .reverse()
    .find((m) => m.role === "assistant");
  const previewMessage =
    displayMessages.find((m) => m.id === rawPreviewId) ?? lastAssistant;

  const streamingMessageId = isReplay
    ? replayTargetId
    : busy
      ? displayMessages.at(-1)?.role === "assistant"
        ? displayMessages.at(-1)?.id
        : null
      : null;

  useEffect(() => {
    if (streaming) {
      return;
    }
    if (!previewMessage) {
      paintRawStream("", "");
      setRawStats({ chars: 0, chunks: 0 });
      return;
    }
    paintRawStream(
      previewMessage.reasoning ?? "",
      previewMessage.content,
    );
    setRawStats((prev) => ({
      chars: formatRawStream(
        previewMessage.reasoning ?? "",
        previewMessage.content,
      ).length,
      chunks: prev.chunks,
    }));
  }, [streaming, paintRawStream, previewMessage]);

  useEffect(() => {
    if (streaming || rawPreviewId || !lastAssistant) {
      return;
    }
    setRawPreviewId(lastAssistant.id);
  }, [streaming, lastAssistant, rawPreviewId]);

  return (
    <div className="chat-app">
      <header className="chat-hdr">
        <h1>HtmlStream Chat</h1>
        <span className="chat-hdr-meta" title={session.id}>
          {session.id.slice(0, 12)}…
        </span>
        <div className="chat-hdr-actions">
          <a href="/">Examples demo</a>
        </div>
      </header>

      <div className="chat-body">
        <SessionSidebar
          sessions={sessionList}
          activeSessionId={session.id}
          session={session}
          replayTargetId={replayTargetId}
          replaySettings={replaySettings}
          streaming={streaming}
          onRefreshSessions={() => void refreshSessions()}
          onSelectSession={(id) => void selectSession(id)}
          onNewChat={startNewChat}
          onReplayTarget={setReplayTargetId}
          onReplaySettingsChange={(patch) =>
            setReplaySettings((prev) => ({ ...prev, ...patch }))
          }
          onReplay={() => void runReplay()}
          onStopReplay={() => {
            stopStreaming();
            setIsReplay(false);
            setReplaySlice(null);
          }}
        />

        <div className="chat-main">
          <div className="chat-msgs" ref={msgsRef}>
            <div className="chat-thread">
              {displayMessages.length === 0 && !error && (
                <div className="chat-empty">
                  Ask anything — the model replies as HTML.
                  <br />
                  Pick a saved session on the left to replay its stream.
                </div>
              )}

              {error && <div className="chat-error">{error}</div>}

              {displayMessages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="chat-msg-user">
                    {m.content}
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className={`chat-msg-ai${rawPreviewId === m.id ? " chat-msg-ai-preview" : ""}`}
                    onClick={() => setRawPreviewId(m.id)}
                    title="Click to show this reply's raw stream"
                  >
                    <HtmlStream
                      reasoning={m.reasoning}
                      isStreaming={streaming && m.id === streamingMessageId}
                    >
                      {m.content}
                    </HtmlStream>
                  </div>
                ),
              )}
            </div>
          </div>

          <form className="chat-form-wrap" onSubmit={onSubmit}>
            <div className="chat-form">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask for a table, chart HTML, explanation…"
                disabled={streaming}
                autoFocus
              />
              <button type="submit" disabled={streaming || !draft.trim()}>
                {busy ? "Streaming…" : isReplay ? "Replaying…" : "Send"}
              </button>
            </div>
          </form>
        </div>

        <aside className={`chat-bts${streaming ? " chat-bts-live" : ""}`}>
          <div className="chat-bts-hdr">
            <span className="chat-bts-title">Raw stream</span>
            <span className="chat-bts-meta">
              {isReplay ? "replay" : busy ? "live" : "idle"} ·{" "}
              {rawStats.chunks.toLocaleString()} chunks ·{" "}
              {rawStats.chars.toLocaleString()} chars
            </span>
          </div>
          <pre
            className="chat-bts-pre"
            ref={btsRef}
            aria-label="Raw model output"
          />
          {!streaming && rawStats.chars === 0 && (
            <div className="chat-bts-empty">
              Send a message or replay a saved reply — raw tokens show here.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
