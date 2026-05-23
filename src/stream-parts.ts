export type StreamPartKind = "reasoning" | "content";

export interface StreamPart {
  kind: StreamPartKind;
  delta: string;
}

export function parseStreamPartLine(line: string): StreamPart | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const part = JSON.parse(trimmed) as StreamPart;
    if (
      (part.kind === "reasoning" || part.kind === "content") &&
      typeof part.delta === "string" &&
      part.delta.length > 0
    ) {
      return part;
    }
  } catch {
    // fall through to multi-object parse
  }

  return parseStreamPartsText(trimmed).parts[0] ?? null;
}

/** Parse one or more glued NDJSON stream objects from text. */
export function parseStreamPartsText(text: string): {
  parts: StreamPart[];
  rest: string;
} {
  const parts: StreamPart[] = [];
  let index = 0;

  while (index < text.length) {
    while (index < text.length && text[index] !== "{") {
      index++;
    }
    if (index >= text.length) {
      break;
    }

    let parsed: StreamPart | null = null;
    let end = -1;

    for (let cursor = index + 1; cursor <= text.length; cursor++) {
      if (text[cursor - 1] !== "}") {
        continue;
      }
      try {
        const candidate = JSON.parse(text.slice(index, cursor)) as StreamPart;
        if (
          (candidate.kind === "reasoning" || candidate.kind === "content") &&
          typeof candidate.delta === "string" &&
          candidate.delta.length > 0
        ) {
          parsed = candidate;
          end = cursor;
          break;
        }
      } catch {
        // keep extending
      }
    }

    if (!parsed || end === -1) {
      return { parts, rest: text.slice(index) };
    }

    parts.push(parsed);
    index = end;
  }

  return { parts, rest: "" };
}

/** Split corrupted saved assistant text that contains NDJSON stream parts. */
export function splitStoredStreamText(text: string): {
  reasoning: string;
  content: string;
} {
  if (!text.includes('"kind":"')) {
    return { reasoning: "", content: text };
  }

  let reasoning = "";
  let content = "";
  const { parts } = parseStreamPartsText(text);
  for (const part of parts) {
    if (part.kind === "reasoning") {
      reasoning += part.delta;
    } else {
      content += part.delta;
    }
  }

  if (!reasoning && !content) {
    return { reasoning: "", content: text };
  }

  return { reasoning, content };
}

export async function readStreamParts(
  body: ReadableStream<Uint8Array>,
  onPart: (part: StreamPart) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      throw new DOMException("Aborted", "AbortError");
    }

    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const { parts, rest } = parseStreamPartsText(line);
      for (const part of parts) {
        onPart(part);
      }
      if (rest.trim()) {
        buffer = rest + (buffer ? `\n${buffer}` : "");
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const { parts, rest } = parseStreamPartsText(trailing);
    for (const part of parts) {
      onPart(part);
    }
    if (rest.trim()) {
      const legacy = parseStreamPartLine(rest);
      if (legacy) {
        onPart(legacy);
      }
    }
  }
}
