import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const SYSTEM_PROMPT = `You are a helpful assistant. Respond using HTML fragments only.
Rules:
- Output raw HTML only — no markdown fences, no \`\`\`html blocks
- Do not wrap in <html>, <head>, or <body>
- Use valid HTML elements and attributes only
- Style all elements with inline style attributes only — never use <style> tags
- Do not use script tags or inline event handlers (onclick, onload, onerror, etc.)`;

/** Merge Vite env with a plain .env file (e.g. C:\\Users\\win10\\Documents\\research\\.env) */
export function loadProjectEnv(
  envRoot: string,
  viteEnv: Record<string, string>,
): Record<string, string> {
  const merged = { ...viteEnv };
  const envPath = path.join(envRoot, ".env");

  if (!fs.existsSync(envPath)) {
    return merged;
  }

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) {
      merged[key] = value;
    }
  }

  return merged;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export type StreamPartKind = "reasoning" | "content";

export interface StreamPart {
  kind: StreamPartKind;
  delta: string;
}

function extractDeltaContent(delta: Record<string, unknown> | undefined): string {
  if (!delta) {
    return "";
  }

  const { content, text } = delta;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }

  if (typeof text === "string") {
    return text;
  }

  return "";
}

function extractDeltaReasoning(delta: Record<string, unknown> | undefined): string {
  if (!delta) {
    return "";
  }

  const { reasoning, reasoning_content, reasoning_details } = delta;

  if (typeof reasoning === "string") {
    return reasoning;
  }

  if (typeof reasoning_content === "string") {
    return reasoning_content;
  }

  if (!Array.isArray(reasoning_details)) {
    return "";
  }

  return reasoning_details
    .map((detail) => {
      if (!detail || typeof detail !== "object") {
        return "";
      }
      const entry = detail as Record<string, unknown>;
      if (entry.type === "reasoning.text" && typeof entry.text === "string") {
        return entry.text;
      }
      if (entry.type === "reasoning.summary" && typeof entry.summary === "string") {
        return entry.summary;
      }
      if (typeof entry.text === "string") {
        return entry.text;
      }
      if (typeof entry.summary === "string") {
        return entry.summary;
      }
      return "";
    })
    .join("");
}

function extractDeltaParts(delta: Record<string, unknown> | undefined): StreamPart[] {
  const parts: StreamPart[] = [];
  const reasoning = extractDeltaReasoning(delta);
  const content = extractDeltaContent(delta);

  if (reasoning) {
    parts.push({ kind: "reasoning", delta: reasoning });
  }
  if (content) {
    parts.push({ kind: "content", delta: content });
  }

  return parts;
}

function writeStreamPart(res: ServerResponse, part: StreamPart): void {
  res.write(`${JSON.stringify(part)}\n`);
  flushResponse(res);
}

function flushResponse(res: ServerResponse): void {
  const flushable = res as ServerResponse & { flush?: () => void };
  flushable.flush?.();
}

async function pipeOpenRouterStream(
  res: ServerResponse,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<void> {
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "StreamHtml Chat",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      stream: true,
      reasoning: { enabled: true },
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: errText || upstream.statusText }));
    return;
  }

  if (!upstream.body) {
    res.statusCode = 502;
    res.end("No response body from OpenRouter");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.flushHeaders?.();

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) {
          continue;
        }
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          continue;
        }
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: Record<string, unknown> }[];
          };
          for (const part of extractDeltaParts(json.choices?.[0]?.delta)) {
            writeStreamPart(res, part);
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  } finally {
    res.end();
  }
}

export function openRouterChatPlugin(env: Record<string, string>): Plugin {
  return {
    name: "openrouter-chat-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== "/api/chat" || req.method !== "POST") {
          next();
          return;
        }

        const apiKey = env.OPENROUTER_API_KEY;
        const model = env.MODEL_NAME;

        if (!apiKey || !model) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error:
                "Missing OPENROUTER_API_KEY or MODEL_NAME in .env (project root)",
            }),
          );
          return;
        }

        try {
          const raw = await readBody(req);
          const { messages } = JSON.parse(raw) as {
            messages?: { role: string; content: string }[];
          };

          if (!Array.isArray(messages) || messages.length === 0) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "messages array required" }));
            return;
          }

          await pipeOpenRouterStream(res, apiKey, model, messages);
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : "Chat failed",
              }),
            );
          } else {
            res.end();
          }
        }
      });
    },
  };
}
