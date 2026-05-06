// Tayseer Oracle Worker — fetches market prices and updates price_oracles
// + appends to oracle_price_history. Triggered every 5 minutes by pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OracleQuote {
  symbol: string;
  price_usd: number;
}

// Demo upstream — Coingecko simple price (USD). Symbols mapped to CG ids.
const SYMBOL_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  EGP: "egyptian-pound", // not on CG; will be skipped silently
  GOLD: "tether-gold",
};

async function fetchUpstream(): Promise<OracleQuote[]> {
  const ids = Object.values(SYMBOL_MAP).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = await res.json() as Record<string, { usd: number }>;
  const out: OracleQuote[] = [];
  for (const [sym, cg] of Object.entries(SYMBOL_MAP)) {
    const px = json[cg]?.usd;
    if (typeof px === "number" && Number.isFinite(px)) {
      out.push({ symbol: sym, price_usd: px });
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let quotes: OracleQuote[] = [];
    // Allow callers to push custom quotes; otherwise fetch upstream.
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.quotes)) quotes = body.quotes;
    }
    if (quotes.length === 0) quotes = await fetchUpstream();

    let updated = 0;
    for (const q of quotes) {
      const { error: e1 } = await supabase
        .from("price_oracles")
        .upsert({ symbol: q.symbol, price_usd: q.price_usd, updated_at: new Date().toISOString() },
                { onConflict: "symbol" });
      if (e1) { console.error("upsert", q.symbol, e1.message); continue; }

      const { error: e2 } = await supabase
        .from("oracle_price_history")
        .insert({ symbol: q.symbol, price_usd: q.price_usd });
      if (e2) console.error("history", q.symbol, e2.message);

      updated++;
    }

    return new Response(JSON.stringify({ ok: true, updated, ran_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tayseer-oracle error", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
