/**
 * Phase 10 — Business Rules Editor
 * ----------------------------------------------------------------
 * Two side-by-side editors that let an admin tune the platform's
 * dynamic business rules WITHOUT a code deploy:
 *
 *   1. Loyalty Tier Rules — discount % and points multiplier per tier
 *      (Bronze → VIP). Reads/writes `loyalty_tier_rules`.
 *   2. Incentive Ladder — cart milestones (free delivery, kitchen gift,
 *      extra discount). Reads/writes `incentive_milestones`.
 *
 * RLS enforces admin-only writes; we still gate the page on
 * `RoleGuard` so non-admins never see the editor.
 *
 * Mobile-first: 375px renders one card per tier/milestone with
 * comfortable touch targets.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Gem,
  Loader2,
  Medal,
  Save,
  Sparkles,
  Star,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import BackHeader from "@/components/BackHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listLoyaltyTierRulesFn,
  updateLoyaltyTierRuleFn,
  listIncentiveMilestonesFn,
  updateIncentiveMilestoneFn,
  type TierRuleRow as TierRule,
  type MilestoneRow as Milestone,
} from "@/core/commerce/policies/business-rules.functions";

type TierKey = TierRule["tier"];

const TIER_META: Record<
  TierKey,
  { label: string; icon: typeof Crown; gradient: string }
> = {
  bronze: { label: "برونزي", icon: Medal, gradient: "from-amber-700 to-amber-900" },
  silver: { label: "فضي", icon: Star, gradient: "from-slate-400 to-slate-600" },
  gold: { label: "ذهبي", icon: Crown, gradient: "from-yellow-500 to-amber-600" },
  platinum: { label: "بلاتيني", icon: Gem, gradient: "from-cyan-400 to-blue-600" },
  vip: { label: "VIP", icon: Sparkles, gradient: "from-fuchsia-500 to-purple-700" },
};

/* =============================== Page =============================== */

const BusinessRules = () => {
  const [tab, setTab] = useState<"loyalty" | "incentives">("loyalty");

  return (
    <div className="space-y-4 pb-24">
      <BackHeader title="قواعد العمل" subtitle="Loyalty & Incentive Ladder" />

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
        <TabBtn
          active={tab === "loyalty"}
          onClick={() => setTab("loyalty")}
          label="نسب الولاء"
        />
        <TabBtn
          active={tab === "incentives"}
          onClick={() => setTab("incentives")}
          label="سلم الحوافز"
        />
      </div>

      {tab === "loyalty" ? <LoyaltyEditor /> : <IncentiveEditor />}
    </div>
  );
};

const TabBtn = ({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => (
  <Button
    onClick={onClick}
    className={`rounded-xl px-3 py-2 text-[12.5px] font-extrabold transition-colors ${
      active
        ? "bg-card text-foreground shadow-sm"
        : "text-muted-foreground"
    }`}
  >
    {label}
  </Button>
);

/* ===================== Loyalty Tier Editor ===================== */

const LoyaltyEditor = () => {
  const [rows, setRows] = useState<TierRule[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const data = await listLoyaltyTierRulesFn();
        if (!alive) return;
        setRows(data);
      } catch (e) {
        if (!alive) return;
        toast.error((e as Error).message);
        setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const updateRow = (id: string, patch: Partial<TierRule>) => {
    setRows((prev) =>
      (prev ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const persistRow = async (row: TierRule) => {
    setSavingId(row.id);
    try {
      await updateLoyaltyTierRuleFn({
        data: {
          id: row.id,
          discount_pct: row.discount_pct,
          points_multiplier: row.points_multiplier,
          min_lifetime_spend: row.min_lifetime_spend,
          is_active: row.is_active,
        },
      });
      toast.success(`تم حفظ ${TIER_META[row.tier]?.label ?? row.tier}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  if (rows === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const meta = TIER_META[r.tier];
        const Icon = meta?.icon ?? Star;
        return (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/50"
          >
            <div
              className={`flex items-center gap-2 bg-gradient-to-l p-2.5 text-white ${meta?.gradient ?? "from-slate-500 to-slate-700"}`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.6} />
              <p className="font-display text-[14px] font-extrabold">
                {meta?.label ?? r.tier}
              </p>
              <span className="ms-auto text-[10px] font-bold opacity-80">
                {r.tier.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2.5 p-3">
              <NumberRow
                label="نسبة الخصم"
                suffix="%"
                value={Math.round(r.discount_pct * 10000) / 100}
                onChange={(v) =>
                  updateRow(r.id, { discount_pct: Math.max(0, Math.min(50, v)) / 100 })
                }
                step={0.5}
                max={50}
              />
              <NumberRow
                label="مضاعف النقاط"
                suffix="×"
                value={r.points_multiplier}
                onChange={(v) =>
                  updateRow(r.id, { points_multiplier: Math.max(0, Math.min(10, v)) })
                }
                step={0.25}
                max={10}
              />
              <NumberRow
                label="حد إنفاق العمر"
                suffix="ج"
                value={r.min_lifetime_spend}
                onChange={(v) =>
                  updateRow(r.id, { min_lifetime_spend: Math.max(0, v) })
                }
                step={100}
              />

              <Button
                disabled={savingId === r.id}
                onClick={() => persistRow(r)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[12px] font-extrabold text-primary-foreground press disabled:opacity-50"
              >
                {savingId === r.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                حفظ
              </Button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

/* ===================== Incentive Editor ===================== */

const IncentiveEditor = () => {
  const [rows, setRows] = useState<Milestone[] | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const data = await listIncentiveMilestonesFn();
        if (!alive) return;
        setRows(data);
      } catch (e) {
        if (!alive) return;
        toast.error((e as Error).message);
        setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const updateRow = (id: string, patch: Partial<Milestone>) => {
    setRows((prev) =>
      (prev ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const persistRow = async (row: Milestone) => {
    setSavingId(row.id);
    try {
      await updateIncentiveMilestoneFn({
        data: {
          id: row.id,
          threshold: row.threshold,
          title: row.title,
          reward: row.reward,
          sort_order: row.sort_order,
          is_active: row.is_active,
        },
      });
      toast.success(`تم حفظ "${row.title}"`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  if (rows === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <motion.div
          key={r.id}
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5 rounded-2xl bg-card p-3 ring-1 ring-border/50"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Target className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <div className="flex-1">
              <p className="font-display text-[13px] font-extrabold">
                {r.title}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground">
                {r.key}
              </p>
            </div>
            <ToggleSwitch
              checked={r.is_active}
              onChange={(v) => updateRow(r.id, { is_active: v })}
            />
          </div>

          <TextRow
            label="عنوان المرحلة"
            value={r.title}
            onChange={(v) => updateRow(r.id, { title: v })}
          />
          <TextRow
            label="نص المكافأة"
            value={r.reward}
            onChange={(v) => updateRow(r.id, { reward: v })}
          />
          <NumberRow
            label="حد التفعيل"
            suffix="ج"
            value={r.threshold}
            onChange={(v) => updateRow(r.id, { threshold: Math.max(1, v) })}
            step={50}
          />

          <Button
            disabled={savingId === r.id}
            onClick={() => persistRow(r)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[12px] font-extrabold text-primary-foreground press disabled:opacity-50"
          >
            {savingId === r.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            حفظ
          </Button>
        </motion.div>
      ))}
    </div>
  );
};

/* ===================== Field Primitives ===================== */

interface NumberRowProps {
  label: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  max?: number;
}
const NumberRow = ({
  label,
  suffix,
  value,
  onChange,
  step = 1,
  max,
}: NumberRowProps) => (
  <div className="flex items-center gap-2">
    <label className="flex-1 text-[12px] font-bold text-muted-foreground">
      {label}
    </label>
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-lg bg-muted/40 px-2 py-1.5 text-right text-[13px] font-extrabold tabular-nums outline-none ring-1 ring-border focus:ring-primary"
      />
      <span className="text-[11px] font-bold text-muted-foreground">
        {suffix}
      </span>
    </div>
  </div>
);

interface TextRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}
const TextRow = ({ label, value, onChange }: TextRowProps) => (
  <div>
    <label className="mb-1 block text-[11px] font-bold text-muted-foreground">
      {label}
    </label>
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-muted/40 px-2 py-1.5 text-[13px] font-extrabold outline-none ring-1 ring-border focus:ring-primary"
    />
  </div>
);

const ToggleSwitch = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <Button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-10 rounded-full transition-colors ${
      checked ? "bg-primary" : "bg-muted"
    }`}
    aria-pressed={checked}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${
        checked ? "right-0.5" : "right-[18px]"
      }`}
    />
  </Button>
);

export default BusinessRules;
