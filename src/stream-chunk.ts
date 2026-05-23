export const STREAM_CHUNK_CLASS = "sh-stream-chunk";

/** Append streamed plain text in its own animated reveal wrapper. */
export function appendStreamingTextChunk(parent: Element, text: string): void {
  if (!text) {
    return;
  }

  const span = document.createElement("span");
  span.className = STREAM_CHUNK_CLASS;
  span.textContent = text;
  parent.appendChild(span);
}

/** Flatten reveal wrappers when streaming finishes. */
export function settleStreamChunks(root: ParentNode): void {
  root.querySelectorAll(`.${STREAM_CHUNK_CLASS}`).forEach((span) => {
    const parent = span.parentNode;
    if (!parent) {
      return;
    }
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    span.remove();
  });
}
