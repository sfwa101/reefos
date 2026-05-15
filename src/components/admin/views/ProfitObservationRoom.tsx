/**
 * Phase 10 — Profit Observation Room
 * ----------------------------------------------------------------
 * Admin-only command surface that surfaces every override that the
 * `LossPreventionRule` has logged to `admin_override_logs`.
 *
 * - Read-only feed (the table is INSERT-only by RLS design).
 * - Each row exposes: who overrode, when, original vs overridden
 *   grand total, the loss-prevention reason, and the admin-supplied
 *   justification.
 * - "اعتماد إداري" (Approve with Override) action: opens a confirm
 *   dialog that asks for a justification (≥ 10 chars) and inserts a
 *   new immutable row recording the admin's review.
 *
 * All math comes from the pricing engine (rows already store the
 * pre-/post-override totals); this page never recomputes anything.
 *
 * Mobile-first: every card stays readable at 375px wide. The table
 * collapses to vertical cards under `md`.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  TrendingDown,
  X,
} from "lucide-react";
import { toast } from "sonner";
import BackHeader from "@/components/BackHeader";
import {
  listAdminOverrideLogsFn,
  recordAdminOverrideApprovalFn,
  type OverrideLogRow,
} from "@/core/finance/profit-observation.functions";
import { useAdminOverrideLogsRealtime } from "@/core/events/hooks/useAdminOverrideLogsRealtime";
import { toLatin } from "@/lib/format";
import { Button } from "@/components/ui/button";

const ProfitObservationRoom = () => {
  const [rows, setRows] = useState<OverrideLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<OverrideLogRow | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listAdminOverrideLogsFn();
        if (!alive) return;
        setRows(data);
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message);
        setRows([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  useAdminOverrideLogsRealtime((row) => {
    setRows((prev) => {
      const next = (prev ?? []).slice();
      next.unshift(row);
      return next.slice(0, 100);
    });
  });

  const stats = useMemo(() => {
    if (!rows || rows.length === 0) {
      return { count: 0, totalReturned: 0, productsAffected: 0 };
    }
    let totalReturned = 0;
    const products = new Set<string>();
    for (const r of rows) {
      const orig = r.original_grand_total ?? 0;
      const over = r.overridden_grand_total ?? 0;
      totalReturned += Math.max(0, orig - over);
      if (r.product_id) products.add(r.product_id);
    }
    return {
      count: rows.length,
      totalReturned: Math.round(totalReturned * 100) / 100,
      productsAffected: products.size,
    };
  }, [rows]);

  const submitReview = async () => {
    if (!reviewing) return;
    if (reviewReason.trim().length < 10) {
      toast.error("اكتب سبباً مفصلاً (10 أحرف على الأقل)");
      return;
    }
    setSubmitting(true);
    try {
      await recordAdminOverrideApprovalFn({
        data: {
          source_log_id: reviewing.id,
          product_id: reviewing.product_id,
          cart_id: reviewing.cart_id,
          order_id: reviewing.order_id,
          original_grand_total: reviewing.original_grand_total,
          overridden_grand_total: reviewing.overridden_grand_total,
          loss_prevention_reason: reviewing.loss_prevention_reason,
          justification: reviewReason.trim(),
        },
      });
      toast.success("تم تسجيل الاعتماد الإداري");
      setReviewing(null);
      setReviewReason("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <BackHeader title="مراقبة الأرباح" subtitle="Phase 10 — Profit Observation" />

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          tone="primary"
          label="تجاوزات مسجلة"
          value={toLatin(stats.count)}
          icon={ShieldCheck}
        />
        <StatCard
          tone="warning"
          label="إجمالي الخصم المعتمد"
          value={`${toLatin(Math.round(stats.totalReturned))} ج`}
          icon={TrendingDown}
        />
        <StatCard
          tone="info"
          label="منتجات متأثرة"
          value={toLatin(stats.productsAffected)}
          icon={AlertTriangle}
        />
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 p-3 text-[12px] font-bold text-destructive ring-1 ring-destructive/30">
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 p-6 text-center ring-1 ring-emerald-300/40">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
          <p className="text-[13px] font-extrabold text-emerald-800 dark:text-emerald-300">
            لا توجد تجاوزات مسجلة بعد — كل الطلبات داخل الحدود الآمنة ✨
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {rows.map((r) => (
            <OverrideCard
              key={r.id}
              row={r}
              onReview={() => {
                setReviewing(r);
                setReviewReason("");
              }}
            />
          ))}
        </ol>
      )}

      {reviewing && (
        <ReviewDialog
          row={reviewing}
          reason={reviewReason}
          setReason={setReviewReason}
          onClose={() => setReviewing(null)}
          onSubmit={submitReview}
          submitting={submitting}
        />
      )}
    </div>
  );
};

/* ======================== Subcomponents ======================== */

const TONES = {
  primary: "bg-primary/10 text-primary ring-primary/20",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-400/30",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-400/30",
} as const;

interface StatCardProps {
  tone: keyof typeof TONES;
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}
const StatCard = ({ tone, label, value, icon: Icon }: StatCardProps) => (
  <div className={`rounded-2xl p-3 ring-1 ${TONES[tone]}`}>
    <div className="mb-1 flex items-center justify-between">
      <Icon className="h-4 w-4" strokeWidth={2.4} />
    </div>
    <p className="text-[10px] font-bold opacity-80">{label}</p>
    <p className="font-display text-[18px] font-extrabold tabular-nums leading-tight">
      {value}
    </p>
  </div>
);

const OverrideCard = ({
  row,
  onReview,
}: {
  row: OverrideLogRow;
  onReview: () => void;
}) => {
  const orig = row.original_grand_total ?? 0;
  const over = row.overridden_grand_total ?? 0;
  const delta = Math.max(0, orig - over);
  const created = new Date(row.created_at).toLocaleString("ar-EG", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-3 ring-1 ring-border/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-muted-foreground">{created}</p>
          <p className="mt-0.5 text-[12px] font-extrabold text-foreground line-clamp-2">
            {row.reason}
          </p>
          {row.loss_prevention_reason && (
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 line-clamp-2">
              ⚠️ {row.loss_prevention_reason}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-extrabold text-destructive">
          −{toLatin(Math.round(delta))} ج
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-muted/50 p-2 text-center">
        <Mini label="أصلي" value={`${toLatin(Math.round(orig))} ج`} />
        <Mini label="بعد التجاوز" value={`${toLatin(Math.round(over))} ج`} />
        <Mini
          label={row.product_id ? "المنتج" : "السلة"}
          value={(row.product_id ?? row.cart_id ?? "—").slice(0, 8)}
        />
      </div>

      <Button
        onClick={onReview}
        className="mt-2 w-full rounded-xl bg-primary px-3 py-2 text-[12px] font-extrabold text-primary-foreground press"
      >
        اعتماد إداري
      </Button>
    </motion.li>
  );
};

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[9px] font-bold text-muted-foreground">{label}</p>
    <p className="font-display text-[12px] font-extrabold tabular-nums">{value}</p>
  </div>
);

interface ReviewDialogProps {
  row: OverrideLogRow;
  reason: string;
  setReason: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
}
const ReviewDialog = ({
  row,
  reason,
  setReason,
  onClose,
  onSubmit,
  submitting,
}: ReviewDialogProps) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-md space-y-3 rounded-3xl bg-card p-4 ring-1 ring-border"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[16px] font-extrabold">
          اعتماد التجاوز إداريّاً
        </h2>
        <Button
          onClick={onClose}
          aria-label="إغلاق"
          className="rounded-full bg-muted p-1.5"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-3 text-[11px] font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-300/40">
        ⚠️ هذا الإجراء يُسجَّل بشكل دائم في `admin_override_logs` ولا يمكن
        حذفه. سيظهر باسمك في سجل التدقيق.
      </div>

      <div className="rounded-xl bg-muted/40 p-3 text-[11.5px]">
        <p className="font-bold text-muted-foreground">سبب الحارس المالي:</p>
        <p className="mt-0.5 text-foreground">
          {row.loss_prevention_reason ?? "—"}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-[12px] font-bold">
          سبب الاعتماد (إلزامي — 10 أحرف على الأقل)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-xl bg-muted/40 p-3 text-[13px] outline-none ring-1 ring-border focus:ring-primary"
          placeholder="مثال: عميل VIP، صفقة معتمدة من المدير العام…"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onClose}
          className="rounded-xl bg-muted px-3 py-2.5 text-[12px] font-extrabold"
        >
          إلغاء
        </Button>
        <Button
          disabled={submitting || reason.trim().length < 10}
          onClick={onSubmit}
          className="rounded-xl bg-destructive px-3 py-2.5 text-[12px] font-extrabold text-destructive-foreground disabled:opacity-40"
        >
          {submitting ? "…جارٍ التسجيل" : "اعتماد وتسجيل"}
        </Button>
      </div>
    </motion.div>
  </div>
);

export default ProfitObservationRoom;
