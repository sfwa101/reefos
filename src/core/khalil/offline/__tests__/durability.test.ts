import { describe, expect, it } from "vitest";
import {
  KHALIL_QUEUE_MAX_SIZE,
  backoffMs,
  diagnose,
  enforceMaxSize,
  pruneOrphans,
} from "../durability";
import type { KhalilQueuedIntent } from "../../offlineQueue";

const mk = (i: number, createdAt = 0): KhalilQueuedIntent => ({
  id: `id-${i}`,
  capability: "HABIT_COMPLETE_WRITE" as never,
  payload: { i },
  createdAt,
  idempotencyKey: `idem-${i}`,
});

describe("offline durability", () => {
  it("backoff is monotonic and capped", () => {
    const a = backoffMs(0, 0);
    const b = backoffMs(3, 0);
    const huge = backoffMs(99, 0);
    expect(b).toBeGreaterThan(a);
    expect(huge).toBeLessThanOrEqual(300_000 + 0xff * 4);
  });

  it("enforceMaxSize drops oldest first (FIFO)", () => {
    const buf = Array.from({ length: KHALIL_QUEUE_MAX_SIZE + 3 }, (_, i) =>
      mk(i),
    );
    const { kept, dropped } = enforceMaxSize(buf);
    expect(kept).toHaveLength(KHALIL_QUEUE_MAX_SIZE);
    expect(dropped).toHaveLength(3);
    expect(dropped[0].id).toBe("id-0");
  });

  it("pruneOrphans removes entries past TTL", () => {
    const now = 1_000_000_000;
    const fresh = mk(1, now - 1000);
    const ancient = mk(2, now - 1000 * 60 * 60 * 24 * 30);
    const { kept, pruned } = pruneOrphans([fresh, ancient], now);
    expect(kept.map((i) => i.id)).toEqual(["id-1"]);
    expect(pruned.map((i) => i.id)).toEqual(["id-2"]);
  });

  it("diagnose summarizes the queue", () => {
    const d = diagnose([mk(1, 100), mk(2, 200)], 500);
    expect(d.size).toBe(2);
    expect(d.oldestAgeMs).toBe(400);
    expect(d.capabilities.HABIT_COMPLETE_WRITE).toBe(2);
  });
});
