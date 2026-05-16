/**
 * Khalil — Prayer event payload contract (P2.2 / Art. IV).
 *
 * The event NAME lives in `@/core/khalil/events` (KHALIL_EVENT). This
 * module owns the wire-level payload shape so subscribers consume only
 * what the producer published — never reaching into another domain's
 * tables (Anti-pattern 06).
 */
import type { PrayerMode, PrayerName } from "./schemas";

export interface KhalilPrayerLoggedEnvelope {
  /** Event-row id (uuid). */
  id: string;
  /** Schema version of `payload`. Bump on breaking changes. */
  version: 1;
  /** Trace id for correlation across runtime + projection. */
  trace_id: string;
  /** ISO timestamp (UTC) when the event was minted. */
  occurred_at: string;
  /** Event name — kept as a literal for exhaustiveness checks. */
  name: "khalil.prayer.logged";
  payload: {
    user_id: string;
    prayer: PrayerName;
    mode: PrayerMode;
    logged_for_date: string;
    occurred_at: string;
  };
}
