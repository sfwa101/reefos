import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Crown, Lock, Send, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import {
  computeParticipantShares,
  type SharedCart,
  type SharedCartParticipant,
  type SharedCartSplitType,
} from "@/features/cart/hooks/useSharedCartSync";

type Props = {
  cart: SharedCart;
  participants: SharedCartParticipant[];
  isOwner: boolean;
  subtotal: number;
  onRequestApprovals: () => Promise<void>;
  onReopenForEdits: () => Promise<void>;
  onCancel: () => Promise<void>;
  onUpdateSplit: (
    participantId: string,
    splitType: SharedCartSplitType,
    splitValue: number,
  ) => Promise<void>;
};

const STATUS_LABEL: Record<SharedCart["status"], { label: string; tone: string }> = {
  active: { label: "نشط — يمكن التعديل", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  pending_approvals: { label: "بانتظار موافقة الكل", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  frozen: { label: "تم الموافقة — جاهز للدفع", tone: "bg-primary/15 text-primary" },
  completed: { label: "اكتمل", tone: "bg-foreground/10 text-muted-foreground" },
  cancelled: { label: "ملغي", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
};

export const SharedCartManager = ({
  cart,
  participants,
  isOwner,
  subtotal,
  onRequestApprovals,
  onReopenForEdits,
  onCancel,
  onUpdateSplit,
}: Props) => {
  const [busy, setBusy] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/cart?join=${cart.id}`;
  }, [cart.id]);

  const shares = useMemo(
    () => computeParticipantShares(participants, subtotal),
    [participants, subtotal],
  );

  const status = STATUS_LABEL[cart.status];
  const isLocked = cart.status !== "active";

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("تم نسخ رابط الدعوة 📋");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإجراء");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-2xl bg-card p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.1)] ring-1 ring-border/30"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
          <Users className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-extrabold">سلة عائلية مشتركة</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {cart.title || `سلة #${cart.id.slice(0, 6)}`}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${status.tone}`}>
          {status.label}
        </span>
      </div>

      {/* Participants list */}
      <div className="space-y-2">
        {participants.map((p) => {
          const share = shares[p.user_id] ?? 0;
          const isOwnerRow = p.role === "owner";
          const approvalTone =
            p.approval_status === "approved"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : p.approval_status === "rejected"
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                : "bg-foreground/10 text-muted-foreground";
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-xl bg-foreground/5 p-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isOwnerRow ? <Crown className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-extrabold">
                  {isOwnerRow ? "صاحب السلة" : "مساهم"} · {p.user_id.slice(0, 6)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {p.split_type === "percentage"
                    ? `${p.split_value}٪`
                    : p.split_type === "fixed"
                      ? `${fmtMoney(p.split_value)} ثابت`
                      : "حسب البنود"}
                  {" · "}
                  حصة: {fmtMoney(share)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${approvalTone}`}
              >
                {p.approval_status === "approved"
                  ? "وافق ✓"
                  : p.approval_status === "rejected"
                    ? "رفض ✗"
                    : "بانتظار"}
              </span>
              {isOwner && !isOwnerRow && cart.status === "active" && (
                <select
                  value={p.split_type}
                  onChange={(e) =>
                    guard(() =>
                      onUpdateSplit(
                        p.id,
                        e.target.value as SharedCartSplitType,
                        p.split_value,
                      ),
                    )
                  }
                  className="rounded-lg bg-card px-1.5 py-1 text-[10px] font-bold ring-1 ring-border/40 outline-none"
                >
                  <option value="percentage">٪</option>
                  <option value="fixed">ثابت</option>
                  <option value="itemized">بنود</option>
                </select>
              )}
            </div>
          );
        })}
      </div>

      {/* Owner controls */}
      {isOwner && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setShowInvite((v) => !v)}
            disabled={isLocked}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground/5 px-3 py-2.5 text-xs font-extrabold disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            دعوة عضو
          </button>
          {cart.status === "active" && (
            <button
              onClick={() => guard(onRequestApprovals)}
              disabled={busy || subtotal <= 0}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-[hsl(150_55%_38%)] px-3 py-2.5 text-xs font-extrabold text-primary-foreground shadow-[0_6px_18px_-6px_hsl(150_60%_40%/0.55)] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              طلب الموافقات
            </button>
          )}
          {(cart.status === "pending_approvals" || cart.status === "frozen") && (
            <button
              onClick={() => guard(onReopenForEdits)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground/10 px-3 py-2.5 text-xs font-extrabold disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              إعادة الفتح للتعديل
            </button>
          )}
          {cart.status !== "completed" && cart.status !== "cancelled" && (
            <button
              onClick={() => guard(onCancel)}
              disabled={busy}
              className="rounded-xl bg-rose-500/10 px-3 py-2.5 text-xs font-extrabold text-rose-600 dark:text-rose-300 disabled:opacity-50"
            >
              إلغاء
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-xl bg-foreground/5 p-2">
              <input
                value={inviteUrl}
                readOnly
                className="flex-1 bg-transparent text-[11px] outline-none ltr:text-left rtl:text-right tabular-nums"
              />
              <button
                onClick={copyInvite}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-extrabold text-primary-foreground"
              >
                <Copy className="h-3 w-3" />
                نسخ
              </button>
            </div>
            <p className="mt-1 px-1 text-[10px] text-muted-foreground">
              شارك هذا الرابط مع أفراد العائلة للانضمام للسلة
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
