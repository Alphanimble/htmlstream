import type { ChatMessage, ChatSession } from "./session";
import {
  formatSessionWhen,
  type SessionSummary,
} from "./session-api";

export interface ReplaySettings {
  delayMs: number;
  chunkSize: number;
}

interface SessionSidebarProps {
  sessions: SessionSummary[];
  activeSessionId: string;
  session: ChatSession;
  replayTargetId: string | null;
  replaySettings: ReplaySettings;
  streaming: boolean;
  onRefreshSessions: () => void;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onReplayTarget: (messageId: string) => void;
  onReplaySettingsChange: (patch: Partial<ReplaySettings>) => void;
  onReplay: () => void;
  onStopReplay: () => void;
}

function assistantTurns(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m.role === "assistant" && m.content.trim());
}

function turnLabel(message: ChatMessage, index: number): string {
  const plain = message.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const snippet = plain.slice(0, 48) || "(empty)";
  return `#${index + 1} · ${snippet}${plain.length > 48 ? "…" : ""}`;
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  session,
  replayTargetId,
  replaySettings,
  streaming,
  onRefreshSessions,
  onSelectSession,
  onNewChat,
  onReplayTarget,
  onReplaySettingsChange,
  onReplay,
  onStopReplay,
}: SessionSidebarProps) {
  const turns = assistantTurns(session.messages);
  const canReplay = Boolean(replayTargetId) && !streaming;

  return (
    <aside className="chat-sidebar">
      <div className="chat-sidebar-hdr">
        <span className="chat-sidebar-title">Sessions</span>
        <div className="chat-sidebar-hdr-actions">
          <button type="button" onClick={onRefreshSessions} disabled={streaming}>
            ↻
          </button>
          <button type="button" onClick={onNewChat} disabled={streaming}>
            +
          </button>
        </div>
      </div>

      <div className="chat-session-list">
        {sessions.length === 0 && (
          <div className="chat-session-empty">No saved sessions yet.</div>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chat-session-item${s.id === activeSessionId ? " chat-session-item-active" : ""}`}
            onClick={() => onSelectSession(s.id)}
            disabled={streaming}
            title={s.preview}
          >
            <span className="chat-session-item-id">{s.id.slice(5, 14)}</span>
            <span className="chat-session-item-preview">{s.preview}</span>
            <span className="chat-session-item-meta">
              {formatSessionWhen(s.updatedAt)} · {s.messageCount} msgs
            </span>
          </button>
        ))}
      </div>

      <div className="chat-replay-panel">
        <div className="chat-replay-title">Stream replay</div>
        <p className="chat-replay-hint">
          Re-stream a saved assistant reply through HtmlStream.
        </p>

        <label className="chat-replay-field">
          <span>Speed</span>
          <select
            value={String(replaySettings.delayMs)}
            disabled={streaming}
            onChange={(e) =>
              onReplaySettingsChange({ delayMs: Number(e.target.value) })
            }
          >
            <option value="0">Instant</option>
            <option value="4">Fast</option>
            <option value="16">Normal</option>
            <option value="40">Slow</option>
          </select>
        </label>

        <label className="chat-replay-field">
          <span>Chunk size</span>
          <select
            value={String(replaySettings.chunkSize)}
            disabled={streaming}
            onChange={(e) =>
              onReplaySettingsChange({ chunkSize: Number(e.target.value) })
            }
          >
            <option value="1">1 char</option>
            <option value="4">4 chars</option>
            <option value="12">12 chars</option>
            <option value="0">API-like (random)</option>
          </select>
        </label>

        <div className="chat-replay-turns">
          {turns.length === 0 && (
            <div className="chat-session-empty">No assistant replies yet.</div>
          )}
          {turns.map((turn, index) => (
            <button
              key={turn.id}
              type="button"
              className={`chat-replay-turn${replayTargetId === turn.id ? " chat-replay-turn-active" : ""}`}
              onClick={() => onReplayTarget(turn.id)}
              disabled={streaming}
            >
              {turnLabel(turn, index)}
            </button>
          ))}
        </div>

        <div className="chat-replay-actions">
          {streaming ? (
            <button type="button" className="chat-replay-stop" onClick={onStopReplay}>
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="chat-replay-play"
              onClick={onReplay}
              disabled={!canReplay}
            >
              Replay stream
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
