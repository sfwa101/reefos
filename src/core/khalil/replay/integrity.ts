/**
 * Replay integrity — pure checksum + drift comparison helpers.
 * No I/O; callers feed in live and replayed projection snapshots.
 */
import type { KhalilProjectionKey } from "./topology";

export interface DriftReport {
  key: KhalilProjectionKey;
  liveChecksum: string;
  replayChecksum: string;
  drift: boolean;
  sampleMismatches: number;
}

/**
 * Stable JSON checksum (FNV-1a 32-bit). Deterministic key ordering so
 * two structurally-equal snapshots hash identically regardless of the
 * traversal that produced them.
 */
export function checksumProjection(rows: readonly unknown[]): string {
  const canonical = JSON.stringify(rows, sortKeysReplacer);
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function detectDrift(
  key: KhalilProjectionKey,
  live: readonly unknown[],
  replayed: readonly unknown[],
): DriftReport {
  const liveChecksum = checksumProjection(live);
  const replayChecksum = checksumProjection(replayed);
  let sampleMismatches = 0;
  const len = Math.min(live.length, replayed.length);
  for (let i = 0; i < len; i++) {
    if (
      JSON.stringify(live[i], sortKeysReplacer) !==
      JSON.stringify(replayed[i], sortKeysReplacer)
    ) {
      sampleMismatches++;
    }
  }
  sampleMismatches += Math.abs(live.length - replayed.length);
  return {
    key,
    liveChecksum,
    replayChecksum,
    drift: liveChecksum !== replayChecksum,
    sampleMismatches,
  };
}

function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}
