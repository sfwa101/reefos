/**
 * Phase 66.1 — Smart Action Composer.
 *
 * Floating "+" button that opens a contextual modal asking
 * "ماذا تريد أن تسجل؟" with progressive disclosure. Stubs for now —
 * each action will later open its own focused composer powered by Hakim
 * (zero data entry: predict, then confirm).
 *
 * Mounted globally inside `AdminShell`. Adapts to active workspace kind.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, X, ArrowLeft, HandCoins, Receipt, PackagePlus, Wallet, Users, GraduationCap, Sparkles, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useSovereignContext, type WorkspaceKind } from "@/core/capabilities/store/useSovereignContext";
import { Button } from "@/components/ui/button";
// SmartProductComposer dialog removed in V-1.C — replaced by /admin/assets/genesis route.

type Action = {
  key: string;
  label: string;
  hint: string;
  icon: typeof HandCoins;
  cap?: string;
  /** Special intent handled inline by the composer (e.g. open product dialog). */
  intent?: "new-product";
  /** Target route — when provided, picking the action navigates instead of opening a placeholder. */
  to?: string;
  /** Marks the action as not-yet-available (Coming Soon). */
  soon?: boolean;
};

const NEW_PRODUCT: Action = {
  key: "new-product",
  label: "منتج جديد",
  hint: "أسقِط صورة — وحكيم ينتظر أمرك",
  icon: Sparkles,
  to: "/admin/assets/genesis",
};

const NEW_HUMAN: Action = {
  key: "new-human",
  label: "إضافة إنسان جديد",
  hint: "عميل، تاجر، أو موظف — كائن واحد، علاقات متعددة",
  icon: UserPlus,
  to: "/admin/humans",
};

const ACTIONS_BY_KIND: Record<WorkspaceKind, Action[]> = {
  reef: [
    NEW_PRODUCT,
    NEW_HUMAN,
    { key: "supplier-collect", label: "تحصيل من مورد", hint: "حكيم سيقترح المبلغ تلقائيًا", icon: HandCoins, to: "/admin/suppliers" },
    { key: "expense",          label: "إضافة مصروف",   hint: "صنف + مبلغ — والباقي مؤتمت", icon: Receipt, to: "/admin/expenses" },
    { key: "stock-in",         label: "استلام مخزون",  hint: "امسح الباركود فقط",          icon: PackagePlus, to: "/admin/inventory" },
  ],
  tayseer: [
    NEW_HUMAN,
    { key: "expense",        label: "إضافة مصروف",     hint: "تصنيف ذكي عبر حكيم",     icon: Receipt, to: "/admin/expenses" },
    { key: "wallet-topup",   label: "شحن محفظة",       hint: "للعميل أو للموظف",        icon: Wallet, to: "/admin/wallets" },
    { key: "supplier-collect", label: "تحصيل من مورد", hint: "تسجيل في دفتر الأستاذ",  icon: HandCoins, to: "/admin/suppliers" },
  ],
  noor_eldin: [
    NEW_HUMAN,
    { key: "enroll",   label: "تسجيل متعلم",  hint: "في رحلة تعلم",      icon: GraduationCap, soon: true },
    { key: "mentor",   label: "إسناد مرشد",   hint: "حكيم يقترح أفضل توافق", icon: Users, soon: true },
  ],
  family: [
    NEW_HUMAN,
    { key: "wallet-topup", label: "شحن محفظة",   hint: "لأحد أفراد العائلة",  icon: Wallet, to: "/admin/wallets" },
    { key: "expense",      label: "تسجيل مصروف", hint: "تصنيف منزلي",         icon: Receipt, to: "/admin/expenses" },
  ],
  global: [
    NEW_PRODUCT,
    NEW_HUMAN,
    { key: "expense",          label: "إضافة مصروف",   hint: "متعدد المساحات",   icon: Receipt, to: "/admin/expenses" },
    { key: "supplier-collect", label: "تحصيل من مورد", hint: "أي مساحة",         icon: HandCoins, to: "/admin/suppliers" },
    { key: "stock-in",         label: "استلام مخزون",  hint: "أي متجر",          icon: PackagePlus, to: "/admin/inventory" },
  ],
};

export function SmartActionComposer() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Action | null>(null);
  // productOpen state removed in Phase V-1.C — Genesis is a full route now.
  const { activeWorkspaceKind } = useSovereignContext();
  const navigate = useNavigate();
  const actions = ACTIONS_BY_KIND[activeWorkspaceKind] ?? ACTIONS_BY_KIND.global;

  function close() {
    setOpen(false);
    setTimeout(() => setPicked(null), 150);
  }

  function handlePick(a: Action) {
    if (a.soon) return;
    if (a.to) {
      close();
      navigate({ to: a.to as never });
      return;
    }
    setPicked(a);
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="إضافة سريعة"
        className={cn(
          "fixed z-50 lg:hidden bottom-32 right-4",
          "h-14 w-14 rounded-2xl bg-gradient-primary text-primary-foreground",
          "shadow-glow flex items-center justify-center press transition-base",
        )}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </Button>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="إضافة سريعة"
        className={cn(
          "hidden lg:inline-flex items-center gap-1.5 h-10 px-4 rounded-2xl",
          "bg-gradient-primary text-primary-foreground text-[12.5px] font-semibold",
          "press shadow-glow hover:opacity-95",
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} /> إضافة
      </Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent dir="rtl" className="sm:max-w-md rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              {picked ? (
                <Button onClick={() => setPicked(null)} className="text-foreground-tertiary press" aria-label="رجوع">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              ) : <span />}
              <DialogTitle className="font-display text-[18px]">
                {picked ? picked.label : "ماذا تريد أن تسجل؟"}
              </DialogTitle>
              <Button onClick={close} className="text-foreground-tertiary press" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <DialogDescription className="text-[12px] text-foreground-tertiary text-center mt-1">
              {picked ? picked.hint : "اختر إجراءً — حكيم يتولى الباقي"}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {!picked ? (
              <ul className="grid grid-cols-1 gap-2">
                {actions.map((a) => (
                  <li key={a.key}>
                    <Button
                      type="button"
                      onClick={() => handlePick(a)}
                      disabled={a.soon}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-2xl",
                        "bg-surface-muted/60 hover:bg-surface-muted border border-border/40",
                        "text-right press transition-base",
                        a.soon && "opacity-60 cursor-not-allowed hover:bg-surface-muted/60",
                      )}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <a.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold leading-tight">{a.label}</p>
                          {a.soon && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-warning/15 text-warning">
                              قريباً
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-foreground-tertiary leading-tight mt-0.5">{a.hint}</p>
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 px-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <picked.icon className="h-7 w-7" />
                </div>
                <p className="text-[13px] text-foreground-secondary leading-relaxed">
                  محرر <span className="font-semibold text-foreground">{picked.label}</span> قيد التهيئة.
                  حكيم سيملأ الحقول من السياق — وأنت تؤكد فقط.
                </p>
                <Button
                  onClick={close}
                  className="mt-5 h-11 px-6 rounded-xl bg-foreground text-background text-[12.5px] font-semibold press"
                >
                  حسنًا
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SmartActionComposer;
