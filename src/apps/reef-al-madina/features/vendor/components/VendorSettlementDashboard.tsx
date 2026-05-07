import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownCircle,
  Banknote,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet2,
} from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useVendorSettlement,
  type VendorLedgerRow,
  type VendorPayoutRequestRow,
} from "@/features/vendor/hooks/useVendorSettlement";

const KIND_LABELS: Record<VendorLedgerRow["kind"], string> = {
  credit_sale: "بيع",
  debit_commission: "عمولة المنصة",
  debit_payout: "سحب رصيد",
  reversal: "استرداد",
  adjustment: "تسوية",
};

const STATUS_LABELS: Record<VendorPayoutRequestRow["status"], string> = {
  pending: "قيد المراجعة",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

/**
 * VendorSettlementDashboard — financial reconciliation surface for vendors.
 * Pure presentational shell over `useVendorSettlement`. Owns the withdrawal
 * dialog state but never mutates wallets directly — all writes go through the
 * server-side RPC.
 */
export const VendorSettlementDashboard = () => {
  const c = useVendorSettlement();
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] =
    useState<VendorPayoutRequestRow["method"]>("bank_transfer");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");

  const openDialog = (vid: string) => {
    setVendorId(vid);
    setAmount("");
    setAccountName("");
    setAccountNumber("");
    setBankName("");
    setOpen(true);
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!vendorId) return toast.error("لم يتم اختيار البائع");
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("ادخل مبلغ صحيح");
    if (!accountNumber.trim()) return toast.error("ادخل رقم الحساب / المحفظة");

    const bank = {
      account_name: accountName.trim() || null,
      account_number: accountNumber.trim(),
      bank_name: bankName.trim() || null,
    };

    const res = await c.requestPayout(vendorId, amt, method, bank);
    if (res.ok) {
      toast.success("تم تقديم طلب السحب");
      setOpen(false);
    } else {
      toast.error(res.error || "تعذّر تقديم الطلب");
    }
  };

  if (c.loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SUMMARY HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-glow p-5 text-primary-foreground shadow-float"
      >
        <div className="flex items-center gap-2">
          <Wallet2 className="h-4 w-4" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] opacity-90">
            إجمالي رصيد الحسابات
          </p>
        </div>
        <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">
          {fmtMoney(c.totals.available)}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] opacity-95">
          <div>
            <p className="opacity-70">معلّق</p>
            <p className="font-bold">{fmtMoney(c.totals.pending)}</p>
          </div>
          <div>
            <p className="opacity-70">إجمالي الأرباح</p>
            <p className="font-bold">{fmtMoney(c.totals.earned)}</p>
          </div>
          <div>
            <p className="opacity-70">مدفوع</p>
            <p className="font-bold">{fmtMoney(c.totals.paid)}</p>
          </div>
        </div>
      </motion.div>

      {/* PER-VENDOR CARDS */}
      {c.wallets.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center text-[12px] text-muted-foreground ring-1 ring-border/40">
          لا توجد محافظ بائعين بعد.
        </div>
      ) : (
        <div className="space-y-2.5">
          {c.wallets.map((w) => (
            <div
              key={w.vendor_id}
              className="rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border/40"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
                    البائع
                  </p>
                  <p className="text-sm font-extrabold">
                    {w.vendor_name || w.vendor_id.slice(0, 8)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openDialog(w.vendor_id)}
                  disabled={Number(w.available_balance) <= 0}
                >
                  <ArrowDownCircle className="me-1 h-3.5 w-3.5" /> سحب
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <p className="text-muted-foreground">متاح للسحب</p>
                  <p className="font-display text-base font-extrabold tabular-nums text-primary">
                    {fmtMoney(w.available_balance)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">معلّق</p>
                  <p className="font-display text-base font-extrabold tabular-nums">
                    {fmtMoney(w.pending_balance)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OUTSTANDING REQUESTS */}
      {c.requests.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-[11px] font-bold text-muted-foreground">
            طلبات السحب
          </p>
          <div className="divide-y divide-border/60 rounded-2xl bg-card shadow-soft ring-1 ring-border/40">
            {c.requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-4 py-2.5 text-[11px]"
              >
                <div>
                  <p className="font-bold">{fmtMoney(r.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.method} • {new Date(r.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                    r.status === "completed"
                      ? "bg-primary/15 text-primary"
                      : r.status === "rejected"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-foreground/10 text-muted-foreground"
                  }`}
                >
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEDGER */}
      <div>
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-bold text-muted-foreground">
          <Banknote className="h-3.5 w-3.5" /> سجل التسويات
        </p>
        {c.ledger.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center text-[12px] text-muted-foreground ring-1 ring-border/40">
            لا توجد حركات بعد.
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-2xl bg-card shadow-soft ring-1 ring-border/40">
            {c.ledger.slice(0, 30).map((row) => {
              const isCredit = row.kind === "credit_sale" || row.kind === "adjustment";
              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between px-4 py-2.5 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        isCredit
                          ? "bg-primary/15 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {isCredit ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">{KIND_LABELS[row.kind]}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {row.product_name || row.notes || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p
                      className={`font-display text-sm font-extrabold tabular-nums ${
                        isCredit ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {fmtMoney(row.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {row.status === "pending" ? "قيد التصفية" : "مكتمل"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAYOUT DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>طلب سحب رصيد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[11px]">المبلغ (ج.م)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-[11px]">طريقة الاستلام</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                  <SelectItem value="instapay">إنستاباي</SelectItem>
                  <SelectItem value="cash">نقدي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">
                {method === "bank_transfer"
                  ? "رقم الحساب / IBAN"
                  : "رقم المحفظة / المرجع"}
              </Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={method === "bank_transfer" ? "EG..." : "01xxxxxxxxx"}
              />
            </div>
            <div>
              <Label className="text-[11px]">اسم صاحب الحساب</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            {method === "bank_transfer" && (
              <div>
                <Label className="text-[11px]">اسم البنك</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
            )}
            <Button onClick={submit} disabled={c.submitting} className="w-full">
              {c.submitting ? (
                <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              تأكيد طلب السحب
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
