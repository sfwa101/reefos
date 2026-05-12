// Catalog Gateway — Wave P-D · Phase D-4.
// Sanctioned `createServerFn` handlers replacing direct supabase.from(...)
// access from product-detail UI. RLS applies via requireSupabaseAuth-less
// public reads (catalog data is publicly readable per RLS).
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

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

export type ProductUnit = {
  id: string;
  unit_code: string;
  conversion_factor: number;
  selling_price: number | null;
  is_default_sell: boolean;
};

export const listProductReviewsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data }): Promise<{ count: number }> => {
    const supabase = publicClient();
    const { count, error } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("product_id", data.productId);
    if (error) throw new Error(error.message);
    return { count: count ?? 0 };
  });

export const listProductUnitsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data }): Promise<ProductUnit[]> => {
    const supabase = publicClient();
    const { data: rows, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: boolean) => {
                order: (
                  c: string,
                  o: { ascending: boolean },
                ) => Promise<{ data: ProductUnit[] | null; error: { message: string } | null }>;
              };
            };
          };
        };
      }
    )
      .from("product_units")
      .select("id,unit_code,conversion_factor,selling_price,is_default_sell")
      .eq("product_id", data.productId)
      .eq("is_active", true)
      .order("conversion_factor", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProductUnit[];
  });
