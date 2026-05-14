/**
 * Tayseer Oracle — Sovereign Server Function (Wave P-4.2).
 * Replaces the `tayseer-oracle` Supabase Edge Function. Fetches market
 * prices from Coingecko, upserts `price_oracles`, and appends history.
 * Authenticated via `requireSupabaseAuth`; uses the service-role admin
 * client for the writes (bypasses RLS).
 *
 * NOTE: pg_cron previously hit the edge function URL directly. Until the
 * cron migration is updated, this can be invoked manually from the app.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { asDynamic } from "@/integrations/supabase/dynamic";

const SYMBOL_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  EGP: "egyptian-pound",
  GOLD: "tether-gold",
};

interface OracleQuote {
  symbol: string;
  price_usd: number;
}

async function fetchUpstream(): Promise<OracleQuote[]> {
  const ids = Object.values(SYMBOL_MAP).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = (await res.json()) as Record<string, { usd: number }>;
  const out: OracleQuote[] = [];
  for (const [sym, cg] of Object.entries(SYMBOL_MAP)) {
    const px = json[cg]?.usd;
    if (typeof px === "number" && Number.isFinite(px)) out.push({ symbol: sym, price_usd: px });
  }
  return out;
}

const sb = asDynamic(supabaseAdmin);

export const tayseerOracleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { quotes?: OracleQuote[] }) => ({
    quotes: Array.isArray(d?.quotes) ? d.quotes : undefined,
  }))
  .handler(async ({ data }) => {
    try {
      const quotes = data.quotes && data.quotes.length > 0 ? data.quotes : await fetchUpstream();
      let updated = 0;
      for (const q of quotes) {
        const { error: e1 } = await sb
          .from("price_oracles")
          .upsert(
            { symbol: q.symbol, price_usd: q.price_usd, updated_at: new Date().toISOString() },
            { onConflict: "symbol" },
          );
        if (e1) {
          console.error("upsert", q.symbol, e1.message);
          continue;
        }
        const { error: e2 } = await sb
          .from("oracle_price_history")
          .insert({ symbol: q.symbol, price_usd: q.price_usd });
        if (e2) console.error("history", q.symbol, e2.message);
        updated++;
      }
      return { ok: true as const, updated, ran_at: new Date().toISOString() };
    } catch (err) {
      console.error("tayseer-oracle error", err);
      return { ok: false as const, error: String(err) };
    }
  });
