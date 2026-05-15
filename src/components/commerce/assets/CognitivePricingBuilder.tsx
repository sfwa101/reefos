/**
 * CognitivePricingBuilder — Phase E-1
 * ----------------------------------------------------------------
 * The Cognitive Pricing Runtime UI.
 *
 * Renders one pricing card per packaging tier (or a single "base asset" card
 * when packaging is disabled). Each card edits a `FinancialContractDraft`:
 *   • base_price + currency + pricing_model         (fast, simple)
 *   • Policy Graph (rules in contract_rules.policies) — hidden behind an
 *     "Advanced Rules" toggle so standard pricing stays a 3-second job.
 *
 * Pure presentation: ZERO direct DB writes. All state is lifted via
 * `onChange(contracts)` to USAEditor for atomic submission.
 */
import { useCallback, useMemo } from "react";
import {
  Coins,
  Zap,
  Plus,
  Trash2,
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { PackagingTierDraft } from "@/core/commerce";
import type {
  FinancialContractDraft,
  PricingModelKey,
  CurrencyCode,
  PricingPolicyRule,
  PolicyConditionKey,
  PolicyOperator,
  PolicyActionKey,
  ContractRules,
} from "@/core/commerce/types/financialContract";

const PRICING_MODELS: Record<PricingModelKey, string> = {
  flat: "سعر ثابت",
  tiered_wholesale: "أسعار جملة متدرجة",
  subscription: "اشتراك دوري",
  deposit_and_rental: "وديعة + إيجار",
  milestone_installments: "أقساط بمراحل",
};

const CONDITIONS: Record<PolicyConditionKey, { label: string; ops: PolicyOperator[]; sample: string }> = {
  customer_group: { label: "فئة العميل", ops: ["eq", "in"], sample: "VIP" },
  cart_quantity: { label: "كمية السلة", ops: ["gte", "lte", "eq"], sample: "10" },
  season: { label: "الموسم", ops: ["eq"], sample: "ramadan" },
  channel: { label: "قناة البيع", ops: ["eq"], sample: "pos" },
  loyalty_tier: { label: "مستوى الولاء", ops: ["eq", "gte"], sample: "gold" },
};

const OP_LABEL: Record<PolicyOperator, string> = {
  eq: "يساوي",
  gte: "أكبر أو يساوي",
  lte: "أصغر أو يساوي",
  in: "ضمن",
};

const ACTIONS: Record<PolicyActionKey, { label: string; suffix: string }> = {
  discount_percent: { label: "خصم بنسبة", suffix: "٪" },
  discount_amount: { label: "خصم بمبلغ", suffix: "EGP" },
  surcharge_percent: { label: "رسم إضافي بنسبة", suffix: "٪" },
  surcharge_amount: { label: "رسم إضافي بمبلغ", suffix: "EGP" },
};

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

interface Props {
  /** From PackagingHierarchyBuilder. Empty/disabled = single base contract. */
  packagingTiers: PackagingTierDraft[];
  packagingEnabled: boolean;
  /** Lifted state. */
  value: FinancialContractDraft[];
  onChange: (contracts: FinancialContractDraft[]) => void;
  /** Defaults for new contracts. */
  defaultCurrency?: CurrencyCode;
  defaultPricingModel?: PricingModelKey;
  /** Per-card "Advanced rules" toggle is local. Optional global expand state. */
  advancedExpanded?: Record<string, boolean>;
  onToggleAdvanced?: (cardKey: string) => void;
}

export default function CognitivePricingBuilder({
  packagingTiers,
  packagingEnabled,
  value,
  onChange,
  defaultCurrency = "EGP",
  defaultPricingModel = "flat",
}: Props) {
  /** Cards = each tier, or a single virtual "base" card. */
  const cards = useMemo(() => {
    if (!packagingEnabled || packagingTiers.length === 0) {
      return [{ key: "__base__", label: "الأصل الأساسي", uom: null as string | null, isBase: true }];
    }
    return packagingTiers.map((t) => ({
      key: t.id ?? `tier_${t.tier_label}_${t.sort_order}`,
      label: t.tier_label || "وحدة",
      uom: t.uom_code,
      isBase: false,
    }));
  }, [packagingTiers, packagingEnabled]);

  const findContract = useCallback(
    (key: string): FinancialContractDraft | undefined => {
      const isBase = key === "__base__";
      return value.find((c) =>
        isBase ? c.packaging_tier_local_id === null : c.packaging_tier_local_id === key,
      );
    },
    [value],
  );

  const upsertContract = useCallback(
    (key: string, mut: (c: FinancialContractDraft) => FinancialContractDraft) => {
      const isBase = key === "__base__";
      const idx = value.findIndex((c) =>
        isBase ? c.packaging_tier_local_id === null : c.packaging_tier_local_id === key,
      );
      if (idx >= 0) {
        const next = value.slice();
        next[idx] = mut(next[idx]);
        onChange(next);
        return;
      }
      const fresh: FinancialContractDraft = {
        id: newId(),
        packaging_tier_local_id: isBase ? null : key,
        pricing_model: defaultPricingModel,
        base_price: 0,
        currency: defaultCurrency,
        contract_rules: { policies: [] },
        is_active: true,
      };
      onChange([...value, mut(fresh)]);
    },
    [value, onChange, defaultCurrency, defaultPricingModel],
  );

  const removeContract = useCallback(
    (key: string) => {
      const isBase = key === "__base__";
      onChange(
        value.filter((c) =>
          isBase ? c.packaging_tier_local_id !== null : c.packaging_tier_local_id !== key,
        ),
      );
    },
    [value, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
        <Coins className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[12px] font-extrabold text-primary">التسعير الذكي</p>
          <p className="text-[10.5px] text-foreground-tertiary leading-relaxed">
            {packagingEnabled
              ? "حدّد سعراً وسياسة لكل وحدة عبوة. السياسات المتقدمة اختيارية."
              : "حدّد السعر الأساسي للأصل، ثم وسّع القواعد المتقدمة لإضافة سياسات شرطية."}
          </p>
        </div>
      </div>

      {cards.map((card) => {
        const contract = findContract(card.key);
        return (
          <PricingCard
            key={card.key}
            cardKey={card.key}
            label={card.label}
            uom={card.uom}
            isBase={card.isBase}
            contract={contract}
            onChange={(mut) => upsertContract(card.key, mut)}
            onRemove={() => removeContract(card.key)}
            defaultCurrency={defaultCurrency}
            defaultPricingModel={defaultPricingModel}
          />
        );
      })}
    </div>
  );
}

/* =================================================================
 * Per-card editor
 * ================================================================= */
function PricingCard({
  cardKey,
  label,
  uom,
  isBase,
  contract,
  onChange,
  onRemove,
  defaultCurrency,
  defaultPricingModel,
}: {
  cardKey: string;
  label: string;
  uom: string | null;
  isBase: boolean;
  contract: FinancialContractDraft | undefined;
  onChange: (mut: (c: FinancialContractDraft) => FinancialContractDraft) => void;
  onRemove: () => void;
  defaultCurrency: CurrencyCode;
  defaultPricingModel: PricingModelKey;
}) {
  // Simple local UI flag for advanced rules.
  const c = contract;
  const policies = c?.contract_rules.policies ?? [];
  const [advanced, setAdvanced] = useLocalToggle(`pricingAdv:${cardKey}`, policies.length > 0);

  return (
    <div className="rounded-2xl border border-border bg-background-secondary/40 overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-3 py-2.5 bg-background-secondary/70 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
            {isBase ? <Sparkles className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0">
            <p className="text-[12.5px] font-extrabold truncate">{label}</p>
            <p className="text-[10px] text-foreground-tertiary truncate">
              {isBase ? "بدون شجرة عبوات" : uom ? `الوحدة: ${uom}` : "وحدة عبوة"}
            </p>
          </div>
        </div>
        {c && (
          <Button
            type="button"
            onClick={onRemove}
            className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-foreground-tertiary hover:text-rose-600 hover:bg-rose-500/10 press"
            title="إزالة العقد"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </header>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-12 gap-2">
          <label className="col-span-7 block">
            <span className="block text-[10px] font-bold text-foreground-tertiary mb-1">السعر الأساسي</span>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={c?.base_price ?? ""}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  base_price: e.target.value === "" ? 0 : Number(e.target.value),
                }))
              }
              placeholder="0.00"
              dir="ltr"
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-[13.5px] num font-semibold outline-none focus:border-primary text-left"
            />
          </label>
          <label className="col-span-5 block">
            <span className="block text-[10px] font-bold text-foreground-tertiary mb-1">العملة</span>
            <select
              value={c?.currency ?? defaultCurrency}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, currency: e.target.value as CurrencyCode }))
              }
              className="w-full h-10 rounded-xl border border-border bg-background px-2 text-[12.5px] outline-none focus:border-primary"
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-[10px] font-bold text-foreground-tertiary mb-1">نموذج التسعير</span>
          <select
            value={c?.pricing_model ?? defaultPricingModel}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, pricing_model: e.target.value as PricingModelKey }))
            }
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-[12.5px] outline-none focus:border-primary"
          >
            {(Object.keys(PRICING_MODELS) as PricingModelKey[]).map((k) => (
              <option key={k} value={k}>
                {PRICING_MODELS[k]}
              </option>
            ))}
          </select>
        </label>

        {/* Advanced Rules — Policy Graph */}
        <div className="rounded-xl border border-border/60">
          <Button
            type="button"
            onClick={() => setAdvanced(!advanced)}
            className="w-full flex items-center justify-between px-3 py-2 text-[11.5px] font-bold press"
          >
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              قواعد التسعير المتقدمة
              {policies.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold num">
                  {policies.length}
                </span>
              )}
            </span>
            {advanced ? (
              <ChevronDown className="h-3.5 w-3.5 text-foreground-tertiary" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-foreground-tertiary" />
            )}
          </Button>

          {advanced && (
            <div className="border-t border-border/60 p-2.5 space-y-2 bg-background/40">
              {policies.length === 0 && (
                <p className="text-[11px] text-foreground-tertiary text-center py-2">
                  لا توجد قواعد بعد. أضف أول قاعدة بأسلوب «إذا … إذاً …».
                </p>
              )}
              {policies.map((p) => (
                <PolicyRow
                  key={p.id}
                  rule={p}
                  onUpdate={(next) =>
                    onChange((prev) => ({
                      ...prev,
                      contract_rules: replacePolicy(prev.contract_rules, p.id, next),
                    }))
                  }
                  onRemove={() =>
                    onChange((prev) => ({
                      ...prev,
                      contract_rules: removePolicy(prev.contract_rules, p.id),
                    }))
                  }
                />
              ))}
              <Button
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    contract_rules: addPolicy(prev.contract_rules),
                  }))
                }
                className="w-full h-9 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-primary text-[11.5px] font-extrabold press inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> إضافة سياسة تسعير
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================================================================
 * Policy row
 * ================================================================= */
function PolicyRow({
  rule,
  onUpdate,
  onRemove,
}: {
  rule: PricingPolicyRule;
  onUpdate: (r: PricingPolicyRule) => void;
  onRemove: () => void;
}) {
  const cond = CONDITIONS[rule.condition.key];
  return (
    <div className="rounded-xl border border-border bg-background p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-foreground-tertiary">إذا</span>
        <Button
          type="button"
          onClick={onRemove}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-foreground-tertiary hover:text-rose-600 hover:bg-rose-500/10 press"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-12 gap-1.5">
        <select
          value={rule.condition.key}
          onChange={(e) => {
            const key = e.target.value as PolicyConditionKey;
            onUpdate({
              ...rule,
              condition: { key, op: CONDITIONS[key].ops[0], value: CONDITIONS[key].sample },
            });
          }}
          className="col-span-5 h-9 rounded-lg border border-border bg-background px-2 text-[11.5px] outline-none focus:border-primary"
        >
          {(Object.keys(CONDITIONS) as PolicyConditionKey[]).map((k) => (
            <option key={k} value={k}>{CONDITIONS[k].label}</option>
          ))}
        </select>
        <select
          value={rule.condition.op}
          onChange={(e) =>
            onUpdate({ ...rule, condition: { ...rule.condition, op: e.target.value as PolicyOperator } })
          }
          className="col-span-3 h-9 rounded-lg border border-border bg-background px-1 text-[11px] outline-none focus:border-primary"
        >
          {cond.ops.map((op) => (
            <option key={op} value={op}>{OP_LABEL[op]}</option>
          ))}
        </select>
        <Input
          value={String(rule.condition.value)}
          onChange={(e) =>
            onUpdate({ ...rule, condition: { ...rule.condition, value: e.target.value } })
          }
          placeholder={cond.sample}
          className="col-span-4 h-9 rounded-lg border border-border bg-background px-2 text-[11.5px] outline-none focus:border-primary"
        />
      </div>

      <div className="text-[10px] font-extrabold text-foreground-tertiary">إذاً</div>
      <div className="grid grid-cols-12 gap-1.5">
        <select
          value={rule.action.key}
          onChange={(e) =>
            onUpdate({ ...rule, action: { ...rule.action, key: e.target.value as PolicyActionKey } })
          }
          className="col-span-7 h-9 rounded-lg border border-border bg-background px-2 text-[11.5px] outline-none focus:border-primary"
        >
          {(Object.keys(ACTIONS) as PolicyActionKey[]).map((k) => (
            <option key={k} value={k}>{ACTIONS[k].label}</option>
          ))}
        </select>
        <div className="col-span-5 relative">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={Number.isFinite(rule.action.value) ? rule.action.value : 0}
            onChange={(e) =>
              onUpdate({
                ...rule,
                action: { ...rule.action, value: e.target.value === "" ? 0 : Number(e.target.value) },
              })
            }
            dir="ltr"
            className="w-full h-9 rounded-lg border border-border bg-background pl-3 pr-10 text-[12px] num font-semibold outline-none focus:border-primary text-left"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-foreground-tertiary">
            {ACTIONS[rule.action.key].suffix}
          </span>
        </div>
      </div>
    </div>
  );
}

/* =================================================================
 * Helpers — pure, testable mutators on ContractRules
 * ================================================================= */
function addPolicy(rules: ContractRules): ContractRules {
  const fresh: PricingPolicyRule = {
    id: newId(),
    condition: { key: "customer_group", op: "eq", value: "VIP" },
    action: { key: "discount_percent", value: 10 },
    is_active: true,
  };
  return { ...rules, policies: [...(rules.policies ?? []), fresh] };
}

function replacePolicy(rules: ContractRules, id: string, next: PricingPolicyRule): ContractRules {
  return {
    ...rules,
    policies: (rules.policies ?? []).map((p) => (p.id === id ? next : p)),
  };
}

function removePolicy(rules: ContractRules, id: string): ContractRules {
  return {
    ...rules,
    policies: (rules.policies ?? []).filter((p) => p.id !== id),
  };
}

/* =================================================================
 * Tiny local-state hook (keeps each card's "advanced" panel sticky
 * across re-renders without polluting the parent).
 * ================================================================= */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
function useLocalToggle(_key: string, initial: boolean) {
  return useState<boolean>(initial);
}
