import { repairSession, type ChatSession } from "./session";

export interface SessionSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}

function normalizeSession(raw: ChatSession): ChatSession {
  return repairSession({
    ...raw,
    messages: raw.messages.map((m) => ({
      ...m,
      content: typeof m.content === "string" ? m.content : "",
      reasoning: typeof m.reasoning === "string" ? m.reasoning : undefined,
    })),
  });
}

export async function listSessions(): Promise<SessionSummary[]> {
  try {
    const res = await fetch("/api/sessions");
    if (!res.ok) {
      return [];
    }
    return (await res.json()) as SessionSummary[];
  } catch {
    return [];
  }
}

export async function loadSessionById(id: string): Promise<ChatSession | null> {
  try {
    const res = await fetch(`/api/session?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      return null;
    }
    const parsed = (await res.json()) as ChatSession;
    if (!parsed?.id || !Array.isArray(parsed.messages)) {
      return null;
    }
    return normalizeSession(parsed);
  } catch {
    return null;
  }
}

export function sessionPreview(session: ChatSession): string {
  const firstUser = session.messages.find((m) => m.role === "user");
  if (firstUser?.content.trim()) {
    return firstUser.content.trim().slice(0, 72);
  }
  return "(empty)";
}

export function formatSessionWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
