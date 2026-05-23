import { splitStoredStreamText } from "streamhtml";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  at: string;
}

export interface ChatSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = "htmlstream-chat-session-v1";

function repairAssistantMessage(message: ChatMessage): ChatMessage {
  if (message.role !== "assistant") {
    return message;
  }

  const content = typeof message.content === "string" ? message.content : "";
  const reasoning =
    typeof message.reasoning === "string" ? message.reasoning : "";

  if (!content.includes('"kind":"')) {
    return { ...message, content, reasoning: reasoning || undefined };
  }

  const repaired = splitStoredStreamText(content);
  return {
    ...message,
    reasoning: reasoning || repaired.reasoning || undefined,
    content: repaired.content,
  };
}

export function repairSession(session: ChatSession): ChatSession {
  return {
    ...session,
    messages: session.messages.map(repairAssistantMessage),
  };
}

export function createSession(): ChatSession {
  const now = new Date().toISOString();
  return {
    id: `sess_${Date.now().toString(36)}`,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function loadLocalSession(): ChatSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ChatSession;
    if (!parsed?.id || !Array.isArray(parsed.messages)) {
      return null;
    }
    return repairSession({
      ...parsed,
      messages: parsed.messages.map((m) => ({
        ...m,
        content: typeof m.content === "string" ? m.content : "",
        reasoning: typeof m.reasoning === "string" ? m.reasoning : undefined,
      })),
    });
  } catch {
    return null;
  }
}

export function saveLocalSession(session: ChatSession): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...session, updatedAt: new Date().toISOString() }),
  );
}

export async function loadServerSession(): Promise<ChatSession | null> {
  try {
    const res = await fetch("/api/session");
    if (!res.ok) {
      return null;
    }
    const parsed = (await res.json()) as ChatSession | null;
    if (!parsed?.id || !Array.isArray(parsed.messages)) {
      return null;
    }
    return repairSession(parsed);
  } catch {
    return null;
  }
}

export async function saveServerSession(session: ChatSession): Promise<void> {
  try {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
  } catch {
    // localStorage is the primary store; disk log is best-effort
  }
}

export function clearLocalSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
