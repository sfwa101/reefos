import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Search, Loader2, ShieldCheck, Receipt, User as UserIcon, Phone, AlertCircle,
  Coins, Hourglass, CheckCircle2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { UniversalAdminGrid } from "@/components/admin/UniversalAdminGrid";
import {
  searchProfilesFn, getWalletBalanceFn, adminTopupWalletFn,
  adminAdjustWalletFn, reverseWalletEntryFn,
  type ProfileSearchRow,
} from "@/core/finance/finance.functions";
import { fmtMoney, fmtNum, fmtRelative } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = ProfileSearchRow;
type Topup = {
  id: string; user_id: string; amount: number; method: string;
  transfer_reference: string; note: string | null; performed_by_name: string | null;
  status: string; created_at: string;
};

const METHODS = [
  { v: "vodafone_cash", l: "فودافون كاش", color: "bg-[hsl(0_70%_50%)]/10 text-[hsl(0_70%_45%)]" },
  { v: "instapay", l: "إنستاباي", color: "bg-info/10 text-info" },
  { v: "bank_transfer", l: "تحويل بنكي", color: "bg-primary/10 text-primary" },
  { v: "cash", l: "كاش", color: "bg-success/10 text-success" },
];

const STATUS_TONE: Record<string, string> = {
  completed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  frozen: "bg-info/10 text-info",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "معتمد",
  pending: "معلّق",
  rejected: "مرفوض",
  frozen: "مجمّد",
};

function TopupForm() {
  const searchProfiles = useServerFn(searchProfilesFn);
  const getBalance = useServerFn(getWalletBalanceFn);
  const adminTopup = useServerFn(adminTopupWalletFn);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("vodafone_cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = useMemo(() => {
    const a = Number(amount);
    return selected && a > 0 && a <= 100000 && reference.trim().length >= 4;
  }, [amount, reference, selected]);

  useEffect(() => {
    if (search.trim().length < 2) { setMatches([]); return; }
    let cancel = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchProfiles({ data: { term: search.trim() } });
        if (!cancel) setMatches(data);
      } catch {
        if (!cancel) setMatches([]);
      } finally {
        if (!cancel) setSearching(false);
      }
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [search, searchProfiles]);

  useEffect(() => {
    if (!selected) { setBalance(null); return; }
    (async () => {
      try {
        const { balance } = await getBalance({ data: { user_id: selected.id } });
        setBalance(balance);
      } catch {
        setBalance(0);
      }
    })();
  }, [selected, getBalance]);

  const handleTopup = async () => {
    if (!selected || !valid) return;
    setSubmitting(true);
    try {
      await adminTopup({ data: {
        user_id: selected.id,
        amount: Number(amount),
        method,
        transfer_reference: reference.trim(),
        note: note.trim() || null,
      }});
      toast.success(`تم تسجيل الطلب — قيد اعتماد الأدمن (Maker-Checker)`, {
        description: `${fmtMoney(Number(amount))} • سيظهر في رصيد العميل بعد الاعتماد`,
      });
      setAmount(""); setReference(""); setNote("");
    } catch (err) {
      const msg = (err as Error).message;
      const map: Record<string, string> = {
        "duplicate_transfer_reference": "رقم التحويل مستخدم من قبل — تحقق من السجل.",
        "transfer_reference_required": "رقم التحويل إلزامي (4 أحرف على الأقل).",
        "invalid_amount": "المبلغ غير صحيح.",
        "amount_too_large": "المبلغ يتجاوز الحد المسموح (100,000).",
        "user_not_found": "العميل غير موجود.",
        "forbidden": "ليست لديك صلاحية الشحن.",
      };
      const friendly = Object.entries(map).find(([k]) => msg.includes(k))?.[1] ?? msg;
      toast.error(friendly);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="bg-surface rounded-2xl border border-border/40 p-4 space-y-3" dir="rtl">
      <div className="flex items-center gap-2 text-[13px] font-bold">
        <Receipt className="h-4 w-4 text-primary" /> تسجيل شحن يدوي (Maker-Checker)
      </div>

      {!selected ? (
        <>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن عميل بالاسم أو الهاتف"
              className="w-full bg-surface-muted rounded-xl h-11 pr-10 pl-4 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {searching && <p className="text-[12px] text-foreground-tertiary">جارٍ البحث…</p>}
          {matches.length > 0 && (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {matches.map((m) => (
                <Button variant="ghost" key={m.id} onClick={() => { setSelected(m); setSearch(""); setMatches([]); }}
                  className="w-full flex items-center justify-between bg-surface-muted hover:bg-primary/5 rounded-xl p-3 text-right press">
                  <div>
                    <p className="text-[13.5px] font-semibold">{m.full_name ?? "بدون اسم"}</p>
                    <p className="text-[11.5px] text-foreground-tertiary num flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {m.phone ?? "—"}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[12px] opacity-90 flex items-center gap-1"><UserIcon className="h-3 w-3" /> {selected.full_name ?? "بدون اسم"}</p>
              <p className="num text-[11px] opacity-80">{selected.phone ?? "—"}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] opacity-80">الرصيد</p>
              <p className="font-display text-[18px] num leading-none">{balance === null ? "…" : fmtMoney(balance)}</p>
            </div>
            <Button variant="ghost" onClick={() => setSelected(null)} className="text-[11px] underline opacity-90">تغيير</Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input type="number" inputMode="decimal" step="0.01" min="1" max="100000"
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ"
              className="h-11 rounded-xl bg-surface-muted px-3 text-[15px] num text-right font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="رقم التحويل *"
              className="h-11 rounded-xl bg-surface-muted px-3 text-[13px] num text-right border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {METHODS.map((m) => (
              <Button variant="ghost" key={m.v} onClick={() => setMethod(m.v)}
                className={cn("h-9 rounded-xl text-[11px] font-semibold press border",
                  method === m.v ? "border-primary bg-primary text-primary-foreground" : `border-border/40 ${m.color}`)}>
                {m.l}
              </Button>
            ))}
          </div>

          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)"
            className="w-full h-10 rounded-xl bg-surface-muted px-3 text-[12.5px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />

          {reference.length > 0 && reference.trim().length < 4 && (
            <p className="text-[11px] text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> رقم التحويل: 4 أحرف على الأقل
            </p>
          )}

          <Button variant="ghost" onClick={handleTopup} disabled={!valid || submitting}
            className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-[14px] press disabled:opacity-40 flex items-center justify-center gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "جارٍ الشحن…" : `شحن ${amount ? fmtMoney(Number(amount)) : "—"}`}
          </Button>
        </>
      )}
    </div>
  );
}

function AdjustPanel() {
  const searchProfiles = useServerFn(searchProfilesFn);
  const adminAdjust = useServerFn(adminAdjustWalletFn);
  const reverseEntry = useServerFn(reverseWalletEntryFn);

  const [mode, setMode] = useState<"adjust" | "reverse">("adjust");
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [kind, setKind] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [entryId, setEntryId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (search.trim().length < 2) { setMatches([]); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      try {
        const data = await searchProfiles({ data: { term: search.trim() } });
        if (!cancel) setMatches(data);
      } catch { if (!cancel) setMatches([]); }
    }, 300);
    return () => { cancel = true; clearTimeout(t); };
  }, [search, searchProfiles]);

  const handleAdjust = async () => {
    if (!selected) return toast.error("اختر العميل أولاً");
    setBusy(true);
    try {
      await adminAdjust({ data: {
        user_id: selected.id, kind, amount: Number(amount),
        label: label.trim(), note: note.trim() || null,
      }});
      toast.success(kind === "credit" ? "تم إيداع المبلغ" : "تم خصم المبلغ");
      setAmount(""); setLabel(""); setNote("");
    } catch (e) {
      const msg = (e as Error).message;
      const map: Record<string, string> = {
        invalid_amount: "مبلغ غير صحيح", amount_too_large: "المبلغ كبير جداً",
        invalid_label: "الوصف 3-200 حرف", invalid_kind: "نوع غير صالح",
      };
      toast.error(map[msg] ?? msg);
    } finally { setBusy(false); }
  };

  const handleReverse = async () => {
    if (!entryId.trim()) return toast.error("معرف العملية مطلوب");
    if (reason.trim().length < 3) return toast.error("سبب الإلغاء 3 أحرف على الأقل");
    if (!confirm("تأكيد إلغاء هذه العملية؟ سيتم إنشاء قيد عكسي.")) return;
    setBusy(true);
    try {
      await reverseEntry({ data: { id: entryId.trim(), reason: reason.trim() } });
      toast.success("تم إلغاء العملية");
      setEntryId(""); setReason("");
    } catch (e) {
      const msg = (e as Error).message;
      const map: Record<string, string> = {
        entry_not_found: "العملية غير موجودة", already_reversed: "أُلغيت من قبل",
        invalid_id: "معرف غير صالح", invalid_reason: "السبب غير صالح",
      };
      toast.error(map[msg] ?? msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-surface rounded-2xl border border-border/40 p-4 space-y-3" dir="rtl">
      <div className="flex items-center gap-2 text-[13px] font-bold">
        <Coins className="h-4 w-4 text-primary" /> تسوية يدوية / إلغاء قيد
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button variant="ghost" onClick={() => setMode("adjust")}
          className={cn("h-9 rounded-xl text-[12px] font-semibold press border",
            mode === "adjust" ? "border-primary bg-primary text-primary-foreground" : "border-border/40 bg-surface-muted")}>
          تسوية يدوية
        </Button>
        <Button variant="ghost" onClick={() => setMode("reverse")}
          className={cn("h-9 rounded-xl text-[12px] font-semibold press border",
            mode === "reverse" ? "border-primary bg-primary text-primary-foreground" : "border-border/40 bg-surface-muted")}>
          إلغاء قيد
        </Button>
      </div>

      {mode === "adjust" ? (
        !selected ? (
          <>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن عميل بالاسم أو الهاتف"
                className="w-full bg-surface-muted rounded-xl h-11 pr-10 pl-4 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            {matches.length > 0 && (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {matches.map((m) => (
                  <Button variant="ghost" key={m.id} onClick={() => { setSelected(m); setSearch(""); setMatches([]); }}
                    className="w-full flex items-center justify-between bg-surface-muted hover:bg-primary/5 rounded-xl p-3 text-right press">
                    <div>
                      <p className="text-[13.5px] font-semibold">{m.full_name ?? "بدون اسم"}</p>
                      <p className="text-[11.5px] text-foreground-tertiary num flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {m.phone ?? "—"}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-surface-muted rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-semibold">{selected.full_name ?? "بدون اسم"}</p>
                <p className="num text-[11px] text-foreground-tertiary">{selected.phone ?? "—"}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)} className="text-[11px] underline">تغيير</Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Button variant="ghost" onClick={() => setKind("credit")}
                className={cn("h-9 rounded-xl text-[12px] font-semibold press border",
                  kind === "credit" ? "border-success bg-success text-success-foreground" : "border-border/40 bg-success/10 text-success")}>
                إيداع (Credit)
              </Button>
              <Button variant="ghost" onClick={() => setKind("debit")}
                className={cn("h-9 rounded-xl text-[12px] font-semibold press border",
                  kind === "debit" ? "border-destructive bg-destructive text-destructive-foreground" : "border-border/40 bg-destructive/10 text-destructive")}>
                خصم (Debit)
              </Button>
            </div>
            <Input type="number" inputMode="decimal" min="1" max="1000000" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ"
              className="w-full h-11 rounded-xl bg-surface-muted px-3 text-[15px] num text-right font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="وصف القيد (3-200 حرف) *"
              className="w-full h-10 rounded-xl bg-surface-muted px-3 text-[13px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)"
              className="w-full h-10 rounded-xl bg-surface-muted px-3 text-[12.5px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <Button variant="ghost" onClick={handleAdjust} disabled={busy || !amount || label.trim().length < 3}
              className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-[14px] press disabled:opacity-40 flex items-center justify-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "جارٍ التنفيذ…" : (kind === "credit" ? `إيداع ${amount ? fmtMoney(Number(amount)) : "—"}` : `خصم ${amount ? fmtMoney(Number(amount)) : "—"}`)}
            </Button>
          </>
        )
      ) : (
        <>
          <Input value={entryId} onChange={(e) => setEntryId(e.target.value)} placeholder="معرف العملية (UUID)"
            className="w-full h-11 rounded-xl bg-surface-muted px-3 text-[12px] num border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="سبب الإلغاء (3-300 حرف) *" rows={2}
            className="w-full rounded-xl bg-surface-muted px-3 py-2 text-[13px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <Button variant="ghost" onClick={handleReverse} disabled={busy}
            className="w-full h-11 rounded-2xl bg-destructive text-destructive-foreground font-bold text-[14px] press disabled:opacity-40 flex items-center justify-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "جارٍ الإلغاء…" : "إلغاء القيد"}
          </Button>
          <p className="text-[10.5px] text-foreground-tertiary">
            ملاحظة: هذه الأداة تلغي قيد محفظة (wallet_transactions) عبر إنشاء قيد عكسي مساوٍ.
          </p>
        </>
      )}
    </div>
  );
}

export default function AdminWallets() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("store_manager");

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <ShieldCheck className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" />
        <p className="font-display text-[16px]">صلاحية المحافظ للأدمن أو مدير المتجر فقط</p>
      </div>
    );
  }

  return (
    <UniversalAdminGrid<Topup>
      title="شحن المحافظ"
      subtitle="سجل شحن المحافظ مع رقابة Maker-Checker وعمليات سريعة"
      dataSource={{
        table: "wallet_topup_requests",
        select: "id,user_id,amount,method,transfer_reference,note,performed_by_name,status,created_at",
        orderBy: { column: "created_at", ascending: false },
        limit: 200,
        searchKeys: ["user_id", "transfer_reference", "performed_by_name", "note"],
      }}
      metrics={[
        {
          key: "pending",
          label: "بانتظار الاعتماد",
          icon: Hourglass,
          tone: "warning",
          compute: (rows) => fmtNum(rows.filter((r) => r.status === "pending").length),
          urgent: (rows) => rows.some((r) => r.status === "pending"),
          to: "/admin/topup-approvals",
        },
        {
          key: "today",
          label: "إجمالي شحن اليوم",
          icon: Coins,
          tone: "success",
          compute: (rows) => {
            const today = new Date().toDateString();
            return fmtMoney(
              rows
                .filter((r) => r.status === "completed" && new Date(r.created_at).toDateString() === today)
                .reduce((s, r) => s + Number(r.amount ?? 0), 0),
            );
          },
        },
        {
          key: "completed",
          label: "عمليات معتمدة",
          icon: CheckCircle2,
          tone: "info",
          compute: (rows) => fmtNum(rows.filter((r) => r.status === "completed").length),
        },
        {
          key: "total",
          label: "إجمالي العمليات",
          icon: Wallet,
          tone: "primary",
          compute: (rows) => fmtNum(rows.length),
        },
      ]}
      topSlot={<div className="grid gap-3 lg:grid-cols-2"><TopupForm /><AdjustPanel /></div>}
      columns={[
        {
          key: "info",
          className: "flex-1 min-w-0",
          render: (r) => (
            <div className="min-w-0">
              <p className="font-display text-[13.5px] truncate num">
                {fmtMoney(Number(r.amount))} • #{r.user_id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-[11.5px] text-foreground-secondary truncate num">
                {METHODS.find((m) => m.v === r.method)?.l ?? r.method} • {r.transfer_reference}
              </p>
              <p className="text-[10.5px] text-foreground-tertiary num">
                {fmtRelative(r.created_at)} • بواسطة {r.performed_by_name ?? "—"}
              </p>
            </div>
          ),
        },
        {
          key: "note",
          className: "shrink-0 text-left max-w-[180px]",
          hideOnMobile: true,
          render: (r) => <p className="text-[11.5px] text-foreground-tertiary truncate">{r.note ?? "—"}</p>,
        },
        {
          key: "status",
          className: "shrink-0",
          render: (r) => (
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold " +
                (STATUS_TONE[r.status] ?? "bg-muted text-foreground-secondary")
              }
            >
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          ),
        },
      ]}
      empty={{ title: "لا توجد عمليات شحن بعد", hint: "سجّل أول شحن من النموذج أعلاه." }}
    />
  );
}
