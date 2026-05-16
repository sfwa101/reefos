/**
 * Deterministic replay runner. Iterates a list of projection keys in
 * declared order and invokes their gateway functions via injected
 * callbacks (so this module stays free of cross-domain imports and of
 * direct Supabase usage). Pure orchestration.
 */
import {
  KHALIL_PROJECTION_REPLAY,
  type KhalilProjectionKey,
} from "./topology";

export interface ReplayProgress {
  key: KhalilProjectionKey;
  index: number;
  total: number;
  durationMs: number;
  ok: boolean;
  error?: string;
}

export interface ReplayRunOptions {
  /** Subset of projections to replay; defaults to all in declared order. */
  only?: readonly KhalilProjectionKey[];
  /**
   * Injected dispatcher — the caller supplies a function that knows how
   * to invoke each gateway. Keeps this module decoupled from server fns.
   */
  dispatch: (key: KhalilProjectionKey) => Promise<void>;
  onProgress?: (p: ReplayProgress) => void;
  /** Stop on first failure (default true). */
  stopOnError?: boolean;
}

export async function runReplay(
  opts: ReplayRunOptions,
): Promise<ReplayProgress[]> {
  const all = Object.keys(KHALIL_PROJECTION_REPLAY) as KhalilProjectionKey[];
  const order = opts.only ?? all;
  const stopOnError = opts.stopOnError ?? true;
  const report: ReplayProgress[] = [];
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const started = Date.now();
    try {
      await opts.dispatch(key);
      const p: ReplayProgress = {
        key,
        index: i,
        total: order.length,
        durationMs: Date.now() - started,
        ok: true,
      };
      report.push(p);
      opts.onProgress?.(p);
    } catch (e) {
      const p: ReplayProgress = {
        key,
        index: i,
        total: order.length,
        durationMs: Date.now() - started,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
      report.push(p);
      opts.onProgress?.(p);
      if (stopOnError) break;
    }
  }
  return report;
}
