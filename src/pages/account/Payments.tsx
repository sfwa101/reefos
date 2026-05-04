import { useEffect, useState } from "react";
import BackHeader from "@/components/BackHeader";
import { CreditCard, Wallet, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * PaymentMethod — shape served by the future `payment_methods` table.
 * Card data is tokenized server-side; the client only sees the brand + last4.
 */
type PaymentMethod = {
  id: string;
  kind: "wallet" | "card";
  brand: string;
  last4: string | null;
  expires_label: string | null;
  is_default: boolean;
};

/**
 * Payments — Stem-cell payment-methods page.
 *
 * Phase 13.13 purge: removed the hardcoded `initial: Method[]` array.
 * The component now reads from the `payment_methods` table when present;
 * otherwise it shows a clean empty state. No fake balances, no fake cards.
 */
const Payments = () => {
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        if (mounted) setLoading(false);
        return;
      }
      // Stem-cell read — table may not exist yet; fall back gracefully.
      try {
        const { data, error } = await supabase
          // @ts-expect-error — table created in a later migration
          .from("payment_methods")
          .select("id,kind,brand,last4,expires_label,is_default")
          .eq("user_id", uid)
          .order("is_default", { ascending: false });
        if (!mounted) return;
        if (!error && Array.isArray(data)) {
          setList(data as unknown as PaymentMethod[]);
        }
      } catch {
        /* table not yet provisioned — empty state is fine */
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setDefault = (id: string) => {
    setList((p) => p.map((m) => ({ ...m, is_default: m.id === id })));
    toast.success("تم تعيين وسيلة الدفع الافتراضية");
  };
  const remove = (id: string) => {
    setList((p) => p.filter((m) => m.id !== id));
    toast("تم الحذف");
  };

  return (
    <div className="space-y-5">
      <BackHeader title="وسائل الدفع" subtitle="بطاقاتك ومحفظتك" accent="حسابي" />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="glass-strong rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-bold">لا توجد وسائل دفع بعد</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            أضف بطاقتك أو فعّل محفظة ريف لبدء التحويلات الفورية
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <div
              key={m.id}
              className={`glass-strong rounded-2xl p-4 shadow-soft ${
                m.is_default ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-foreground to-foreground/70 text-background">
                  {m.kind === "card" ? (
                    <CreditCard className="h-5 w-5" />
                  ) : (
                    <Wallet className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-extrabold">
                      {m.kind === "card" ? `${m.brand} •••• ${m.last4 ?? ""}` : m.brand}
                    </p>
                    {m.is_default && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
                        افتراضي
                      </span>
                    )}
                  </div>
                  {m.expires_label && (
                    <p className="text-[11px] text-muted-foreground">
                      تنتهي {m.expires_label}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {!m.is_default && (
                    <button
                      onClick={() => setDefault(m.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {m.kind === "card" && (
                    <button
                      onClick={() => remove(m.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => toast("سيتم فتح نموذج إضافة بطاقة جديدة قريباً")}
        className="glass flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-primary shadow-soft"
      >
        <Plus className="h-4 w-4" /> إضافة وسيلة دفع
      </button>
    </div>
  );
};

export default Payments;
