/**
 * HakimGenerativeOverlay — Phase VII Cognitive Deployment
 * --------------------------------------------------------
 * Transient (in-memory) intent + surge store fed by the Salsabil Event Bus.
 * Consumed by:
 *   - useSduiLayout → re-orders blocks BEFORE Zod parse (departments_hub).
 *   - barq-logistics/quote → injects forecasting multiplier per zone.
 *
 * Hard rules:
 *   - Sub-millisecond reads (Map lookups + numeric ops).
 *   - NEVER persisted. Decay every 10 minutes.
 *   - Any output that fails Zod is rejected upstream → caller falls back.
 */
import { eventBus, type SalsabilEvents } from "@/core-os/event-bus";

const DECAY_MS = 10 * 60 * 1000;
const INTENT_HIGH = 3; // ≥3 signals in window → "high intent"

type IntentRow = { score: number; lastAt: number };
type SurgeRow = { factor: number; lastAt: number };

const intentScores = new Map<string, IntentRow>();
const zoneSurge = new Map<string, SurgeRow>();
/** Phase VIII — transient slug→injected blocks (e.g. live delivery ribbon). */
const injectedBlocks = new Map<string, unknown[]>();
const subscribers = new Set<() => void>();

const notify = () => subscribers.forEach((fn) => fn());

const bumpIntent = (key: string, weight: number) => {
  if (!key) return;
  const k = key.toLowerCase();
  const prev = intentScores.get(k);
  const now = Date.now();
  const decayed = prev && now - prev.lastAt < DECAY_MS ? prev.score : 0;
  intentScores.set(k, { score: decayed + weight, lastAt: now });
  notify();
};

// Wire the event bus once per module load.
const onProductViewed = (p: SalsabilEvents["product.viewed"]) => {
  if (p.category) bumpIntent(p.category, 1);
};
const onSearchPerformed = (p: SalsabilEvents["search.performed"]) => {
  if (p.query) bumpIntent(p.query, 0.5);
};
const onCategoryEntered = (p: SalsabilEvents["category.entered"]) => {
  bumpIntent(p.categoryName ?? p.categoryId, 2);
};

eventBus.on("product.viewed", onProductViewed);
eventBus.on("search.performed", onSearchPerformed);
eventBus.on("category.entered", onCategoryEntered);

export const HakimGenerativeOverlay = {
  /** Subscribe React components to overlay changes (returns unsubscribe). */
  subscribe(cb: () => void): () => void {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  },

  /** Returns intent score for a key (decayed). 0 if cold. */
  getIntent(key: string): number {
    const row = intentScores.get(key.toLowerCase());
    if (!row) return 0;
    if (Date.now() - row.lastAt > DECAY_MS) return 0;
    return row.score;
  },

  /** Returns ranked list of "hot" topics over threshold. */
  getHotIntents(min = INTENT_HIGH): Array<{ key: string; score: number }> {
    const now = Date.now();
    const out: Array<{ key: string; score: number }> = [];
    for (const [key, row] of intentScores) {
      if (now - row.lastAt > DECAY_MS) continue;
      if (row.score >= min) out.push({ key, score: row.score });
    }
    return out.sort((a, b) => b.score - a.score);
  },

  /** Push a forecast multiplier for a zone (1.0 = neutral). */
  setZoneSurgeMultiplier(zoneCode: string, factor: number): void {
    if (!zoneCode || !Number.isFinite(factor) || factor <= 0) return;
    zoneSurge.set(zoneCode.toUpperCase(), { factor, lastAt: Date.now() });
    notify();
  },

  /** Read a zone's forecast multiplier (1.0 if cold/decayed). */
  getZoneSurgeMultiplier(zoneCode: string): number {
    const row = zoneSurge.get(zoneCode.toUpperCase());
    if (!row) return 1;
    if (Date.now() - row.lastAt > DECAY_MS) return 1;
    return Math.max(1, row.factor);
  },

  /**
   * Transform an SDUI block payload (raw, pre-Zod) by re-ordering top-level
   * blocks so high-intent topics float to the top. Pure + idempotent.
   * If `raw` is not an array we leave it untouched (parseBlocks will drop it).
   */
  applyToLayout(raw: unknown, slug: string): unknown {
    if (!Array.isArray(raw)) return raw;
    const injected = injectedBlocks.get(slug) ?? [];
    const base = injected.length > 0 ? [...injected, ...raw] : raw;
    if (base.length === 0) return base;
    const hot = this.getHotIntents();
    if (hot.length === 0) return base;

    const matchScore = (block: unknown): number => {
      if (!block || typeof block !== "object") return 0;
      const b = block as { id?: unknown; type?: unknown; props?: { title?: unknown } };
      const id = typeof b.id === "string" ? b.id.toLowerCase() : "";
      const title =
        b.props && typeof b.props.title === "string"
          ? (b.props.title as string).toLowerCase()
          : "";
      let s = 0;
      for (const h of hot) {
        if (id.includes(h.key) || title.includes(h.key)) s += h.score;
      }
      return s;
    };

    // Stable sort: higher matchScore first, original order for ties.
    return base
      .map((block, idx) => ({ block, idx, score: matchScore(block) }))
      .sort((a, b) => (b.score - a.score) || (a.idx - b.idx))
      .map((w) => w.block);
  },

  /** Phase VIII — push a transient block to be injected at the top of `slug`. */
  injectBlock(slug: string, block: unknown): void {
    const list = injectedBlocks.get(slug) ?? [];
    list.push(block);
    injectedBlocks.set(slug, list);
    notify();
  },

  clearInjectedBlocks(slug: string): void {
    if (injectedBlocks.delete(slug)) notify();
  },

  /** Test-only: clear all in-memory state. */
  /** Test-only: clear all in-memory state. */
  _resetForTest(): void {
    intentScores.clear();
    zoneSurge.clear();
    injectedBlocks.clear();
  },
};
