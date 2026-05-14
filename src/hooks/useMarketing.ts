import { useQuery } from "@tanstack/react-query";
import { MarketingGateway } from "@/core/marketing/gateway/MarketingGateway";

const STALE_60S = 60_000;
const STALE_2M = 120_000;

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  placement: string;
  link_url: string | null;
  category_slug: string | null;
  sort_order: number;
};

export type FlashSale = { id: string; ends_at: string; cycle_label: string | null };
export type FlashItem = {
  id: string;
  product_id: string;
  product_name: string | null;
  category: string | null;
  original_price: number;
  discount_pct: number;
  reason: string | null;
  rank: number;
};

/** Banners by placement — cached 60s to handle high traffic. */
export function useBanners(placement: string = "hero") {
  return useQuery({
    queryKey: ["banners", placement],
    staleTime: STALE_60S,
    gcTime: STALE_60S * 5,
    queryFn: async (): Promise<Banner[]> => {
      const nowIso = new Date().toISOString();
      const data = await MarketingGateway.listBanners(placement);
      type RawBanner = { starts_at?: string | null; ends_at?: string | null };
      return ((data ?? []) as RawBanner[]).filter(
        (b) => (!b.starts_at || b.starts_at <= nowIso) && (!b.ends_at || b.ends_at >= nowIso),
      ) as unknown as Banner[];
    },
  });
}

/** Active flash sale + its products — cached 60s. */
export function useFlashSale() {
  return useQuery({
    queryKey: ["flash-sale-active"],
    staleTime: STALE_60S,
    gcTime: STALE_2M,
    queryFn: async (): Promise<{ sale: FlashSale | null; items: FlashItem[] }> => {
      const sale = (await MarketingGateway.getActiveFlashSale()) as FlashSale | null;
      if (!sale) return { sale: null, items: [] };
      const items = await MarketingGateway.listFlashSaleProducts(sale.id);
      return { sale, items: (items ?? []) as unknown as FlashItem[] };
    },
  });
}
