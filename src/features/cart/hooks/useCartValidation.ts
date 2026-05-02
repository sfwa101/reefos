import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toLatin } from "@/lib/format";
import { fireConfetti, fireMiniConfetti } from "@/lib/confetti";
import type { AppliedPromo } from "../types/cart.types";

/** RFC 4122 UUID v1-v5 matcher. */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns a UUID string if valid, otherwise null. Use as RPC `_address_id`. */
export const safeUuidOrNull = (id: unknown): string | null => {
  if (!id) return null;
  const s = String(id);
  return UUID_RE.test(s) ? s : null;
};

/** Guest checkout fields validation. */
export const validateGuestFields = (n: string, p: string, a: string): boolean => {
  if (!n.trim() || !p.trim() || !a.trim()) {
    toast.error("من فضلك اكتب الاسم ورقم الهاتف وعنوان التوصيل");
    return false;
  }
  return true;
};

/** Min order constraint check. Shows toast on failure. */
export const validateMinOrder = (grand: number, minOrderTotal: number): boolean => {
  if (minOrderTotal > 0 && grand < minOrderTotal) {
    toast.error(`الحد الأدنى للطلب هو ${toLatin(minOrderTotal)} ج.م`);
    return false;
  }
  return true;
};

/**
 * Promo code state + verification.
 * Hardcoded REEF10 / WELCOME25 for legacy parity, then RPC `validate_coupon`.
 */
export const useCartValidation = (subtotal: number) => {
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo>(null);
  const [minOrderTotal, setMinOrderTotal] = useState<number>(0);

  // Finance settings (min order total)
  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("key", "finance")
        .maybeSingle();
      const raw = (data?.value as { min_order_total?: number | string } | null)
        ?.min_order_total;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) setMinOrderTotal(n);
    })();
  }, []);

  const applyPromo = async () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    if (code === "REEF10") {
      setAppliedPromo({ code, pct: 0.1 });
      toast.success("تم تطبيق كود الخصم 🎉");
      fireMiniConfetti();
      return;
    }
    if (code === "WELCOME25") {
      setAppliedPromo({ code, pct: 0.25 });
      toast.success("خصم 25٪ تم تفعيله! 🎉");
      fireConfetti();
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("validate_coupon", {
        _code: code,
        _order_total: subtotal,
      });
      if (error) throw error;
      const disc = Number(data?.discount ?? 0);
      if (disc <= 0) throw new Error("invalid");
      const pct = subtotal > 0 ? disc / subtotal : 0;
      setAppliedPromo({ code, pct });
      toast.success(`تم تطبيق ${code} — خصم ${Math.round(disc)} ج 🎉`);
      fireMiniConfetti();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setAppliedPromo(null);
      const msg = String(e?.message ?? "");
      if (msg.includes("level_too_low")) toast.error("هذا الكود حصري لمستويات أعلى");
      else if (msg.includes("expired")) toast.error("الكود منتهي");
      else if (msg.includes("exhausted")) toast.error("نفد رصيد الكود");
      else if (msg.includes("per_user_limit")) toast.error("تم استخدام الكود من قبل");
      else if (msg.includes("below_minimum")) toast.error("الطلب أقل من الحد الأدنى");
      else toast.error("كود غير صالح");
    }
  };

  return {
    promo,
    setPromo,
    appliedPromo,
    setAppliedPromo,
    applyPromo,
    minOrderTotal,
  };
};
