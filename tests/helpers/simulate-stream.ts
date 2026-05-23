import type { RehtmlOptions, RehtmlResult } from "../../src/rehtml";
import { rehtml } from "../../src/rehtml";

/** Yield progressively longer prefixes of HTML (simulates token stream) */
export function* streamChunks(
  full: string,
  chunkSize = 8,
): Generator<string, void, unknown> {
  for (let i = chunkSize; i < full.length + chunkSize; i += chunkSize) {
    yield full.slice(0, Math.min(i, full.length));
  }
}

/** Run rehtml at each chunk boundary */
export function streamSnapshots(
  full: string,
  chunkSize = 8,
  options?: RehtmlOptions,
): RehtmlResult[] {
  return [...streamChunks(full, chunkSize)].map((chunk) =>
    rehtml(chunk, options),
  );
}

/** Assert stable block count never decreases during streaming */
export function assertMonotonicStable(
  snapshots: RehtmlResult[],
): void {
  let max = 0;
  for (const snap of snapshots) {
    if (snap.stable.length < max) {
      throw new Error(
        `Stable count regressed: ${snap.stable.length} < ${max}`,
      );
    }
    max = snap.stable.length;
  }
}

/** Count how many snapshots had incomplete trailing tags stripped */
export function countIncompleteStrips(snapshots: RehtmlResult[]): number {
  return snapshots.filter((s) => s.hadIncompleteTag).length;
}
