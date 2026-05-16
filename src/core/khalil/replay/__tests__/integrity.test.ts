import { describe, expect, it } from "vitest";
import { checksumProjection, detectDrift } from "../integrity";

describe("replay integrity", () => {
  it("checksum is order-stable for keys but not for row order", () => {
    const a = [{ x: 1, y: 2 }];
    const b = [{ y: 2, x: 1 }];
    expect(checksumProjection(a)).toBe(checksumProjection(b));
  });

  it("detects drift when row counts differ", () => {
    const r = detectDrift("adherence", [{ d: 1 }], [{ d: 1 }, { d: 2 }]);
    expect(r.drift).toBe(true);
    expect(r.sampleMismatches).toBeGreaterThan(0);
  });

  it("matches identical snapshots", () => {
    const rows = [{ d: "2026-01-01", c: 3 }];
    const r = detectDrift("adherence", rows, rows);
    expect(r.drift).toBe(false);
    expect(r.sampleMismatches).toBe(0);
  });
});
