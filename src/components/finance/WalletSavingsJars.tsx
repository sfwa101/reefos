import { useState } from "react";
import { motion } from "framer-motion";
import {
  PiggyBank,
  Target,
  Settings2,
  ChevronLeft,
  Plus,
  Minus,
} from "lucide-react";
import { FinanceGateway } from "@/core/finance/gateway/FinanceGateway";
import { toast } from "sonner";
import { toLatin } from "@/lib/format";
import { fireMiniConfetti } from "@/lib/confetti";
import { formatDate } from "@/core/finance/lib/walletAdvisor";
import type { SavingsJar, SavingsTx } from "@/core/finance/types/wallet.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ================= SAVINGS TILE (collapsed surface) ================= */
export const SavingsJarTile = ({
  jar,
  onOpen,
}: {
  jar: SavingsJar | null;
  onOpen: () => void;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.15, duration: 0.4 }}
    onClick={onOpen}
    className="relative cursor-pointer overflow-hidden rounded-2xl p-4 shadow-soft ring-1 ring-border/50"
    style={{
      background: "linear-gradient(135deg, hsl(var(--primary-soft)) 0%, hsl(45 70% 92%) 100%)",
    }}
  >
    <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
    <div className="relative flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(45_80%_55%)] text-white shadow-pill">
        <PiggyBank className="h-6 w-6" strokeWidth={2.2} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-extrabold text-foreground">حصّالتي</h3>
          {jar?.auto_save_enabled && (
            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-extrabold text-primary">
              تلقائي ON
            </span>
          )}
        </div>
        <p className="text-[10px] text-foreground/70">تقريب القروش من كل طلب لتوفير ذكي</p>
      </div>
      <div className="text-right">
        <p className="font-display text-2xl font-extrabold text-foreground tabular-nums">
          {toLatin(Math.round(jar?.balance ?? 0))}
        </p>
        <p className="text-[9px] text-foreground/60">ج.م مُدّخَرة</p>
      </div>
    </div>
    {jar?.goal && jar.goal > 0 && (
      <div className="relative mt-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-foreground/70">{jar.goal_label || "هدفك"}</span>
          <span className="font-extrabold tabular-nums text-foreground">
            {toLatin(Math.min(100, Math.round((jar.balance / jar.goal) * 100)))}٪
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(45_80%_55%)]"
            style={{ width: `${Math.min(100, (jar.balance / jar.goal) * 100)}%` }}
          />
        </div>
      </div>
    )}
  </motion.section>
);

/* ================= SAVINGS JAR DIALOG (expanded surface) ================= */
export const SavingsJarDialog = ({
  onClose,
  userId,
  jar,
  txs,
  onUpdate,
}: {
  onClose: () => void;
  userId: string;
  jar: SavingsJar;
  txs: SavingsTx[];
  onUpdate: (j: SavingsJar, t: SavingsTx[]) => void;
}) => {
  const [autoSave, setAutoSave] = useState(jar.auto_save_enabled);
  const [roundTo, setRoundTo] = useState(jar.round_to);
  const [goal, setGoal] = useState(jar.goal ? String(jar.goal) : "");
  const [goalLabel, setGoalLabel] = useState(jar.goal_label ?? "");
  const [depositAmount, setDepositAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [j, t] = await Promise.all([
      FinanceGateway.getSavingsJar(userId),
      FinanceGateway.listSavingsTransactions(userId, 10),
    ]);
    onUpdate(
      ((j as unknown) ?? {
        balance: 0,
        auto_save_enabled: false,
        round_to: 5,
        goal: null,
        goal_label: null,
      }) as SavingsJar,
      ((t as unknown) ?? []) as SavingsTx[],
    );
  };

  // Phase 37 — All ledger writes go through the atomic RPC.
  // The browser never touches `savings_jar` / `savings_transactions` directly.
  const callJarOp = async (
    kind: "deposit" | "withdraw" | "settings",
    args: { amount?: number; label?: string; settings?: Record<string, unknown> },
  ): Promise<boolean> => {
    const idem =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const { error } = await FinanceGateway.processSavingsJarOp({
      amount: args.amount ?? 0,
      kind,
      label: args.label ?? kind,
      idempotencyKey: idem,
      settings: args.settings ?? null,
    });
    if (error) {
      toast.error(error.message === "insufficient balance" ? "الرصيد غير كافٍ" : "تعذّر الحفظ");
      return false;
    }
    return true;
  };

  const saveSettings = async () => {
    setBusy(true);
    const ok = await callJarOp("settings", {
      settings: {
        auto_save_enabled: autoSave,
        round_to: roundTo,
        goal: goal || null,
        goal_label: goalLabel || null,
      },
    });
    setBusy(false);
    if (ok) {
      toast.success("تم حفظ إعدادات الحصّالة");
      await refresh();
    }
  };

  const deposit = async (amount: number, label: string) => {
    if (amount <= 0) return;
    setBusy(true);
    const ok = await callJarOp("deposit", { amount, label });
    if (ok) {
      fireMiniConfetti();
      toast.success(`+${toLatin(amount)} ج.م في حصّالتك 🐷`);
      await refresh();
      setDepositAmount("");
    }
    setBusy(false);
  };

  const withdraw = async () => {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) return;
    if (amt > Number(jar.balance || 0)) {
      toast.error("الرصيد غير كافٍ");
      return;
    }
    setBusy(true);
    const ok = await callJarOp("withdraw", { amount: amt, label: "سحب من الحصّالة" });
    if (ok) {
      toast.success(`تم تحويل ${toLatin(amt)} ج.م إلى محفظتك`);
      await refresh();
      setDepositAmount("");
    }
    setBusy(false);
  };

  const goalPct =
    jar.goal && jar.goal > 0 ? Math.min(100, (Number(jar.balance) / Number(jar.goal)) * 100) : 0;

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
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 shadow-float ring-1 ring-border/40 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/5"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="font-display text-lg font-extrabold">الحصّالة الذكية</h2>
              <p className="text-[11px] text-muted-foreground">ادّخر بدون أن تشعر</p>
            </div>
          </div>
        </div>

        <div className="relative mb-4 overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-border/50 shadow-sm">
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PiggyBank className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground">الرصيد المُدّخَر</p>
              <p className="font-display text-3xl font-extrabold tabular-nums text-foreground">
                {toLatin(Math.round(jar.balance))}{" "}
                <span className="text-sm text-muted-foreground">ج.م</span>
              </p>
            </div>
          </div>
          {jar.goal && jar.goal > 0 && (
            <div className="relative mt-4">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 font-bold">
                  <Target className="h-3 w-3" /> {jar.goal_label || "هدفك"}
                </span>
                <span className="font-extrabold tabular-nums text-foreground">
                  {toLatin(Math.round(jar.balance))} / {toLatin(Math.round(jar.goal))} ج
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-foreground/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalPct}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
          )}
        </div>

        <p className="mb-2 text-[11px] font-bold text-muted-foreground">إيداع سريع (ج.م)</p>
        <div className="mb-2 grid grid-cols-4 gap-2">
          {[5, 10, 25, 50].map((v) => (
            <Button
              key={v}
              onClick={() => deposit(v, `إيداع يدوي ${v} ج.م`)}
              disabled={busy}
              className="rounded-xl bg-primary/10 py-2.5 text-xs font-extrabold text-primary transition active:scale-95 disabled:opacity-50"
            >
              +{toLatin(v)}
            </Button>
          ))}
        </div>
        <div className="mb-4 flex items-center gap-2">
          <Input
            type="text"
            inputMode="numeric"
            dir="ltr"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="مبلغ مخصص"
            className="flex-1 rounded-xl bg-foreground/5 px-3 py-2.5 text-sm font-bold tabular-nums outline-none"
          />
          <Button
            onClick={() => deposit(Number(depositAmount), `إيداع يدوي ${depositAmount} ج.م`)}
            disabled={busy || !depositAmount}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
          </Button>
          <Button
            onClick={withdraw}
            disabled={busy || !depositAmount}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/10 text-foreground disabled:opacity-50"
          >
            <Minus className="h-4 w-4" strokeWidth={3} />
          </Button>
        </div>

        <div className="mb-4 rounded-2xl bg-foreground/5 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <p className="text-[12px] font-extrabold">الادخار التلقائي</p>
            </div>
            <Button
              onClick={() => setAutoSave((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition ${
                autoSave ? "bg-primary" : "bg-foreground/20"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow ring-1 ring-border/50 transition-all ${
                  autoSave ? "right-0.5" : "right-[calc(100%-1.375rem)]"
                }`}
              />
            </Button>
          </div>
          <p className="mb-2 text-[10px] text-muted-foreground">
            يُقرّب كل طلب لأقرب مضاعف ويضع الفرق في حصّالتك تلقائيًا
          </p>
          <p className="mb-1.5 text-[10px] font-bold text-muted-foreground">قرّب لأقرب</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 25].map((r) => (
              <Button
                key={r}
                onClick={() => setRoundTo(r)}
                className={`rounded-lg py-2 text-[11px] font-extrabold transition ${
                  roundTo === r ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                }`}
              >
                {toLatin(r)} ج
              </Button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Input
              type="text"
              value={goalLabel}
              onChange={(e) => setGoalLabel(e.target.value)}
              placeholder="اسم الهدف (مثلاً: عمرة)"
              className="rounded-lg bg-background px-3 py-2 text-[12px] font-bold outline-none"
            />
            <Input
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={goal}
              onChange={(e) => setGoal(e.target.value.replace(/\D/g, ""))}
              placeholder="مبلغ الهدف"
              className="rounded-lg bg-background px-3 py-2 text-[12px] font-bold tabular-nums outline-none"
            />
          </div>

          <Button
            onClick={saveSettings}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-[12px] font-extrabold text-primary-foreground disabled:opacity-50"
          >
            حفظ الإعدادات
          </Button>
        </div>

        {txs.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold text-muted-foreground">آخر العمليات</p>
            <div className="space-y-1.5">
              {txs.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl bg-foreground/5 px-3 py-2 text-[11px]"
                >
                  <div>
                    <p className="font-bold">{t.label}</p>
                    <p className="text-[9px] text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>
                  <span
                    className={`font-extrabold tabular-nums ${
                      t.kind === "withdraw" ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {t.kind === "withdraw" ? "-" : "+"}
                    {toLatin(Math.round(Math.abs(Number(t.amount))))} ج
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
