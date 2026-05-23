import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";

const SESSION_DIR = path.resolve(__dirname, "../../.chat-sessions");
const CURRENT_FILE = path.join(SESSION_DIR, "current.json");

interface SessionFile {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: { role: string; content?: string }[];
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

function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}

function readSessionFile(filePath: string): SessionFile | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as SessionFile;
  } catch {
    return null;
  }
}

function summarizeSession(session: SessionFile): {
  id: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
} | null {
  if (!session.id) {
    return null;
  }
  const messages = session.messages ?? [];
  const firstUser = messages.find((m) => m.role === "user");
  const preview = (firstUser?.content ?? "").trim().slice(0, 72) || "(empty)";
  return {
    id: session.id,
    createdAt: session.createdAt ?? session.updatedAt ?? "",
    updatedAt: session.updatedAt ?? session.createdAt ?? "",
    messageCount: messages.length,
    preview,
  };
}

function listSessionSummaries(): ReturnType<typeof summarizeSession>[] {
  ensureSessionDir();
  const summaries: NonNullable<ReturnType<typeof summarizeSession>>[] = [];

  for (const name of fs.readdirSync(SESSION_DIR)) {
    if (!name.endsWith(".json") || name === "current.json") {
      continue;
    }
    const session = readSessionFile(path.join(SESSION_DIR, name));
    const summary = session ? summarizeSession(session) : null;
    if (summary) {
      summaries.push(summary);
    }
  }

  return summaries.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function sessionLogPlugin(): Plugin {
  return {
    name: "chat-session-log",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");

        if (url.pathname === "/api/sessions" && req.method === "GET") {
          ensureSessionDir();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(listSessionSummaries()));
          return;
        }

        if (url.pathname !== "/api/session") {
          next();
          return;
        }

        ensureSessionDir();

        if (req.method === "GET") {
          const id = url.searchParams.get("id");
          const filePath = id
            ? path.join(SESSION_DIR, `${id}.json`)
            : CURRENT_FILE;

          if (!fs.existsSync(filePath)) {
            res.statusCode = 204;
            res.end();
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(fs.readFileSync(filePath, "utf8"));
          return;
        }

        if (req.method === "POST") {
          try {
            const raw = await readBody(req);
            const session = JSON.parse(raw) as { id?: string };
            if (!session?.id) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "session.id required" }));
              return;
            }

            const payload = JSON.stringify(session, null, 2);
            fs.writeFileSync(CURRENT_FILE, payload, "utf8");
            fs.writeFileSync(
              path.join(SESSION_DIR, `${session.id}.json`),
              payload,
              "utf8",
            );

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, path: SESSION_DIR }));
          } catch (err) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : "Save failed",
              }),
            );
          }
          return;
        }

        if (req.method === "DELETE") {
          if (fs.existsSync(CURRENT_FILE)) {
            fs.unlinkSync(CURRENT_FILE);
          }
          res.statusCode = 204;
          res.end();
          return;
        }

        next();
      });
    },
  };
}
