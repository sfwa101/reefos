import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toLatin } from "@/lib/format";
import type { WalletAsset } from "@/core/finance/hooks/useWalletAssets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Pair = {
  fromKey: WalletAsset["type"];
  toKey: WalletAsset["type"];
  /** how many `from-units` make 1 `to-unit` */
  rate: number;
  label: string;
};

const PAIRS: Pair[] = [
  { fromKey: "points", toKey: "cashback", rate: 100, label: "نقاط ولاء ← كاش باك" },
  { fromKey: "cashback", toKey: "egp", rate: 1, label: "كاش باك ← جنيه" },
  { fromKey: "gold", toKey: "egp", rate: 1, label: "ذهب رقمي ← جنيه" },
];

/**
 * WalletAssetConvertSheet — UX-only converter between the 5 wallet assets.
 * The actual ledger move requires an `asset_convert` RPC; until that lands
 * we surface a clear "soon" toast so the button is no longer silent.
 */
export const WalletAssetConvertSheet = ({
  assets,
  onClose,
}: {
  assets: WalletAsset[];
  onClose: () => void;
}) => {
  const byKey = useMemo(() => {
    const m = new Map<WalletAsset["type"], WalletAsset>();
    for (const a of assets) m.set(a.type, a);
    return m;
  }, [assets]);

  const [pairIdx, setPairIdx] = useState(0);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const pair = PAIRS[pairIdx];
  const from = byKey.get(pair.fromKey);
  const to = byKey.get(pair.toKey);
  const amt = Number(amount || 0);
  const out = pair.rate > 0 ? amt / pair.rate : 0;
  const overBalance = from ? amt > Number(from.balance) : false;

  const submit = async () => {
    if (!amt || overBalance) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 450));
    setBusy(false);
    toast.info("تحويل الأصول قيد الإطلاق — سيتم تفعيله قريباً جداً.");
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-card p-5 ring-1 ring-border/50 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center gap-2">
          <Button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-display text-lg font-extrabold">تحويل الأصول</h2>
            <p className="text-[11px] text-muted-foreground">
              بدّل بين أصول محفظتك بدون رسوم
            </p>
          </div>
        </div>

        {/* Pair selector */}
        <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-muted/40 p-1 ring-1 ring-border/40">
          {PAIRS.map((p, i) => (
            <Button
              key={p.label}
              type="button"
              onClick={() => {
                setPairIdx(i);
                setAmount("");
              }}
              className={`rounded-xl py-2 text-[10.5px] font-extrabold transition ${
                pairIdx === i
                  ? "bg-background text-foreground ring-1 ring-border/50 shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* From */}
        <Row
          title="من"
          label={from?.label ?? pair.fromKey}
          unit={from?.unit ?? ""}
          balance={Number(from?.balance ?? 0)}
        >
          <Input
            inputMode="decimal"
            dir="ltr"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="0"
            className="w-full bg-transparent text-end font-display text-2xl font-black tabular-nums outline-none text-foreground"
          />
        </Row>

        <div className="my-2 flex justify-center">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
            <ArrowDownUp className="h-4 w-4" />
          </div>
        </div>

        {/* To */}
        <Row
          title="إلى"
          label={to?.label ?? pair.toKey}
          unit={to?.unit ?? ""}
          balance={Number(to?.balance ?? 0)}
        >
          <p className="w-full text-end font-display text-2xl font-black tabular-nums text-foreground/90">
            {toLatin(Number(out.toFixed(2)))}
          </p>
        </Row>

        {overBalance && (
          <p className="mt-2 text-[11px] font-bold text-rose-500">
            الرصيد غير كافٍ
          </p>
        )}

        <Button
          type="button"
          onClick={submit}
          disabled={busy || !amt || overBalance}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-3 text-sm font-extrabold text-primary-foreground shadow-md transition active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحويل الآن"}
        </Button>
        <p className="mt-2 text-center text-[10.5px] text-muted-foreground">
          سعر الصرف ١ {to?.unit} = {toLatin(pair.rate)} {from?.unit}
        </p>
      </motion.div>
    </motion.div>
  );
};

const Row = ({
  title,
  label,
  unit,
  balance,
  children,
}: {
  title: string;
  label: string;
  unit: string;
  balance: number;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl bg-muted/30 p-3 ring-1 ring-border/40">
    <div className="flex items-center justify-between text-[10.5px] font-bold text-muted-foreground">
      <span>{title}</span>
      <span className="tabular-nums">
        الرصيد: {toLatin(Number(balance.toFixed(2)))} {unit}
      </span>
    </div>
    <div className="mt-1 flex items-end justify-between gap-3">
      <p className="text-[12px] font-extrabold text-foreground/90">{label}</p>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  </div>
);
