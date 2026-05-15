// Group-Buy Gateway — Wave P-D · Phase D-4.
// Sanctioned `createServerFn` handlers covering campaign/tier/pledge reads
// and the `pledge_group_buy` RPC mutation. Realtime channels remain wired
// in the consuming hook (sanctioned data plane).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  GroupBuyCampaign,
  GroupBuyPledge,
  GroupBuyTier,
} from "@/core/contracts/group-buy";

function publicClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type GroupBuyState = {
  campaign: GroupBuyCampaign | null;
  tiers: GroupBuyTier[];
  myPledge: GroupBuyPledge | null;
};

// Single round-trip aggregator powering useGroupBuyEngine. Public reads use
// the publishable client so unauthenticated visitors still see live tiers;
// the optional myPledge read piggybacks on the auth middleware.
export const listGroupBuyCampaignsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { campaignId: string }) => d)
  .handler(async ({ data }): Promise<GroupBuyState> => {
    const supabase = publicClient();
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => {
            maybeSingle?: () => Promise<{
              data: unknown;
              error: { message: string } | null;
            }>;
          } & Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
    const [{ data: c, error: ce }, { data: t, error: te }] = await Promise.all([
      sb
        .from("group_buy_campaigns")
        .select("*")
        .eq("id", data.campaignId)
        .maybeSingle!(),
      sb.from("group_buy_tiers").select("*").eq("campaign_id", data.campaignId),
    ]);
    if (ce) throw new Error(ce.message);
    if (te) throw new Error(te.message);
    return {
      campaign: (c as GroupBuyCampaign | null) ?? null,
      tiers: (t as GroupBuyTier[] | null) ?? [],
      myPledge: null,
    };
  });

export const getMyGroupBuyPledgeFn = createServerFn({ method: "GET" })
  .inputValidator((d: { campaignId: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<GroupBuyPledge | null> => {
    const { supabase, userId } = context;
    const { data: row, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: string) => {
                order: (
                  c: string,
                  o: { ascending: boolean },
                ) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{
                      data: GroupBuyPledge | null;
                      error: { message: string } | null;
                    }>;
                  };
                };
              };
            };
          };
        };
      }
    )
      .from("group_buy_pledges")
      .select("*")
      .eq("campaign_id", data.campaignId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const pledgeGroupBuyFn = createServerFn({ method: "POST" })
  .inputValidator((d: { campaignId: string; quantity: number }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: Record<string, string | number | boolean | null> | null; error: { message: string } | null }>
    )("pledge_group_buy", {
      _campaign_id: data.campaignId,
      _quantity: data.quantity,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, data: row };
  });
