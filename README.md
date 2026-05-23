# StreamHtml

A streaming-optimized HTML renderer for AI responses — the HTML counterpart to [Streamdown](https://streamdown.ai).

AI models excel at writing HTML. It's more expressive than markdown: metric dashboards, comparison grids, styled diffs, rich tables, badges, and custom layouts — all in one stream. **StreamHtml** renders that HTML safely while it streams, handling incomplete tags gracefully.

## Demo

Screen recording of the included chat demo (`npm run chat`) streaming a live OpenRouter response as HTML.

GitHub READMEs do not render `<iframe>` or `<video>` embeds ([sanitized HTML only](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#html)). Use the thumbnail below — **click to watch** on Streamable:

[![Watch the StreamHtml demo on Streamable](https://cdn-cf-east.streamable.com/image/j21ang.jpg)](https://streamable.com/j21ang)

Direct link: [streamable.com/j21ang](https://streamable.com/j21ang)

What you're seeing in the recording:

- **Incremental HTML repair** — incomplete tags and unclosed elements are handled as tokens arrive, without layout jumps
- **Live DOM patching** — text and table rows append in place instead of replacing the whole message on every chunk
- **Reasoning panel** — model thinking tokens stream in a collapsible block before HTML content starts
- **Streaming caret** — a smooth block cursor tracks the active text insertion point (only while characters are landing)
- **Text fade-in** — each new chunk of streamed text fades from half-opacity to full
- **Stable blocks** — completed sections freeze so earlier content doesn't re-render during the stream
- **Sanitized output** — DOMPurify strips unsafe markup before anything hits the DOM

## Features

- **Streaming-first** — Strips incomplete tags, auto-closes open elements, splits stable/live blocks
- **Incremental DOM patching** — Appends text and table rows without full re-renders
- **Reasoning tokens** — Optional collapsible thinking block separate from HTML content
- **Streaming caret** — Smooth block cursor that follows live text insertion
- **Performance** — Memoizes completed blocks so they never re-render during streaming
- **Security** — DOMPurify sanitization with secure defaults (no scripts, no event handlers)
- **Drop-in React component** — Works with AI SDK, any chat UI, or plain streaming text
- **Headless core** — Use `rehtml()` without React for Node or other frameworks
- **Raw-text aware** — Respects `<pre>`, `<code>`, etc. where `<` is literal

## Install

```bash
npm install streamhtml
```

## Quick start

```tsx
import { StreamHtml } from "streamhtml";
import "streamhtml/styles.css";

function Message({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  return (
    <StreamHtml isStreaming={isStreaming}>
      {content}
    </StreamHtml>
  );
}
```

### With reasoning tokens

```tsx
<StreamHtml
  isStreaming={isStreaming}
  reasoning={reasoningText}
  thinkingLabel="Thinking"
>
  {htmlContent}
</StreamHtml>
```

### With AI SDK

```tsx
import { useChat } from "@ai-sdk/react";
import { StreamHtml } from "streamhtml";
import "streamhtml/styles.css";

export function Chat() {
  const { messages, status } = useChat();

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.parts.map((part, i) =>
            part.type === "text" ? (
              <StreamHtml
                key={i}
                isStreaming={
                  status === "streaming" &&
                  message.id === messages.at(-1)?.id
                }
              >
                {part.text}
              </StreamHtml>
            ) : null,
          )}
        </div>
      ))}
    </div>
  );
}
```

## How it works

StreamHtml runs a repair pipeline on every chunk:

1. **Strip incomplete tags** — `<div class="met` → removed until the tag completes
2. **Close open tags** — `<strong>bold` → `<strong>bold</strong>`
3. **Split blocks** — Completed top-level blocks are frozen; only the tail re-renders
4. **Patch incrementally** — Plain text and table rows append to the live DOM
5. **Sanitize** — DOMPurify removes XSS vectors before `dangerouslySetInnerHTML`

```
Streaming input          Repair                 Render
─────────────────       ──────────             ──────────
<div>A</div><div>B      stable: [<div>A</div>]  memoized ✓
<div>C                  live: <div>C</div>      re-renders each chunk
```

## API

### `<StreamHtml />`

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `string` | `""` | HTML content to render |
| `reasoning` | `string` | `""` | Plain-text reasoning / thinking tokens |
| `isStreaming` | `boolean` | `false` | Shows caret, marks streaming state |
| `caret` | `boolean` | `isStreaming` | Toggle streaming caret |
| `repair` | `boolean` | `true` | Run incomplete HTML repair |
| `sanitize` | `boolean` | `true` | DOMPurify sanitization |
| `memoizeBlocks` | `boolean` | `true` | Freeze completed blocks |
| `sanitizeConfig` | `Config` | — | DOMPurify config override |
| `thinkingLabel` | `string` | `"Thinking"` | Label for reasoning panel |
| `className` | `string` | — | Root element class |

### `rehtml(input, options?)`

Headless repair function for non-React use:

```ts
import { rehtml } from "streamhtml";

const { html, stable, live, hadIncompleteTag } = rehtml(partialHtml);
```

### `sanitizeHtml(html, config?)`

```ts
import { sanitizeHtml, configureSanitizer } from "streamhtml";

configureSanitizer({ ALLOWED_TAGS: ["div", "p", "span", "table", ...] });
const safe = sanitizeHtml(untrustedHtml);
```

## Prompting tips

Tell your model to output semantic HTML with CSS classes:

```html
<div class="metrics">
  <div class="metric good">
    <div class="metric-val">142ms</div>
    <div class="metric-lbl">avg latency</div>
  </div>
</div>
<table class="rt">
  <thead><tr><th>Endpoint</th><th>Status</th></tr></thead>
  <tbody>...</tbody>
</table>
<div class="callout warn"><strong>Note:</strong> ...</div>
```

Define component styles in your app — StreamHtml ships minimal base styles for tables, code, and typography.

## Development

```bash
git clone <your-repo-url>
cd streamhtml
npm install
npm test
npm run build
```

### Demos

**Gallery** (static examples):

```bash
npm run demo
```

**Chat** (live OpenRouter streaming):

```bash
cp .env.example .env
# Add your OPENROUTER_API_KEY and optional MODEL_NAME
npm run chat
```

The chat demo streams HTML from OpenRouter and persists sessions locally in `.chat-sessions/` (gitignored).

## License

MIT — see [LICENSE](./LICENSE).
