export interface ReplayOptions {
  /** Milliseconds between chunks. 0 = as fast as possible. */
  delayMs: number;
  /** Characters per chunk. 0 = random 1–8 (API-like). */
  chunkSize: number;
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function nextChunkSize(text: string, index: number, chunkSize: number): number {
  if (chunkSize > 0) {
    return Math.min(chunkSize, text.length - index);
  }
  return Math.min(1 + Math.floor(Math.random() * 8), text.length - index);
}

/** Replay saved HTML text chunk-by-chunk like a live API stream. */
export async function replayStream(
  text: string,
  onChunk: (chunk: string) => void,
  options: ReplayOptions,
): Promise<void> {
  let index = 0;
  while (index < text.length) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const size = nextChunkSize(text, index, options.chunkSize);
    const chunk = text.slice(index, index + size);
    index += size;
    onChunk(chunk);
    await sleep(options.delayMs, options.signal);
  }
}
