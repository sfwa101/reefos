import { describe, it, expect } from "vitest";
import {
  composeKhalilHome,
  computeUrgencyScore,
  orderBlocksByUrgency,
  type KhalilHomeContext,
} from "../composeHome";

const ctx = (overrides: Partial<KhalilHomeContext> = {}): KhalilHomeContext => ({
  userId: "u-1",
  localDate: "2026-05-16",
  timeOfDay: "morning",
  recovery: "off",
  capabilities: new Set<string>(),
  adherence: { combinedScore: 0.6, hasActiveHabits: true },
  ...overrides,
});

describe("composeKhalilHome", () => {
  it("hides recovery banner when state is off", () => {
    const d = composeKhalilHome(ctx({ recovery: "off" }));
    expect(d.blocks.find((b) => b.kind === "khalil.recovery.banner")).toBeUndefined();
  });

  it("surfaces recovery banner first when state is soft", () => {
    const d = composeKhalilHome(ctx({ recovery: "soft" }));
    expect(d.blocks[0].kind).toBe("khalil.recovery.banner");
  });

  it("surfaces recovery banner first when state is hard", () => {
    const d = composeKhalilHome(ctx({ recovery: "hard" }));
    expect(d.blocks[0].kind).toBe("khalil.recovery.banner");
  });

  it("prioritizes prayer before Fajr", () => {
    const d = composeKhalilHome(ctx({ recovery: "off", timeOfDay: "fajr" }));
    expect(d.blocks[0].kind).toBe("khalil.prayer.today");
  });

  it("hard recovery places prayer before habit", () => {
    const d = composeKhalilHome(ctx({ recovery: "hard" }));
    const prayerIdx = d.blocks.findIndex((b) => b.kind === "khalil.prayer.today");
    const habitIdx = d.blocks.findIndex((b) => b.kind === "khalil.habit.today");
    expect(prayerIdx).toBeLessThan(habitIdx);
  });

  it("is deterministic for identical inputs", () => {
    const a = composeKhalilHome(ctx());
    const b = composeKhalilHome(ctx());
    expect(a.blocks.map((x) => x.kind)).toEqual(b.blocks.map((x) => x.kind));
  });

  it("computeUrgencyScore returns the recovery banner first", () => {
    const c = ctx({ recovery: "soft" });
    const s = computeUrgencyScore("khalil.recovery.banner", c);
    expect(s).toBeLessThan(computeUrgencyScore("khalil.prayer.today", c));
  });

  it("orderBlocksByUrgency filters invisible blocks", () => {
    const ordered = orderBlocksByUrgency([
      {
        block: { kind: "khalil.recovery.banner", id: "x", props: {} },
        urgency: -100,
        visible: false,
      },
      {
        block: { kind: "khalil.prayer.today", id: "y", props: {} },
        urgency: 0,
        visible: true,
      },
    ]);
    expect(ordered).toHaveLength(1);
    expect(ordered[0].kind).toBe("khalil.prayer.today");
  });
});
