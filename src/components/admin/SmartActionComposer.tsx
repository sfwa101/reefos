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
import { Plus, X, ArrowLeft, HandCoins, Receipt, PackagePlus, Wallet, Users, GraduationCap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useSovereignContext, type WorkspaceKind } from "@/core-os/capabilities/store/useSovereignContext";

type Action = {
  key: string;
  label: string;
  hint: string;
  icon: typeof HandCoins;
  cap?: string;
  /** When set, clicking the action navigates instead of showing the stub. */
  href?: string;
};

const NEW_PRODUCT: Action = {
  key: "new-product",
  label: "منتج جديد",
  hint: "أسقِط صورة — وحكيم يكتب الباقي",
  icon: Sparkles,
  href: "/admin/products/new",
};

const ACTIONS_BY_KIND: Record<WorkspaceKind, Action[]> = {
  reef: [
    NEW_PRODUCT,
    { key: "supplier-collect", label: "تحصيل من مورد", hint: "حكيم سيقترح المبلغ تلقائيًا", icon: HandCoins },
    { key: "expense",          label: "إضافة مصروف",   hint: "صنف + مبلغ — والباقي مؤتمت", icon: Receipt },
    { key: "stock-in",         label: "استلام مخزون",  hint: "امسح الباركود فقط",          icon: PackagePlus },
  ],
  tayseer: [
    { key: "expense",        label: "إضافة مصروف",     hint: "تصنيف ذكي عبر حكيم",     icon: Receipt },
    { key: "wallet-topup",   label: "شحن محفظة",       hint: "للعميل أو للموظف",        icon: Wallet },
    { key: "supplier-collect", label: "تحصيل من مورد", hint: "تسجيل في دفتر الأستاذ",  icon: HandCoins },
  ],
  noor_eldin: [
    { key: "enroll",   label: "تسجيل متعلم",  hint: "في رحلة تعلم",      icon: GraduationCap },
    { key: "mentor",   label: "إسناد مرشد",   hint: "حكيم يقترح أفضل توافق", icon: Users },
  ],
  family: [
    { key: "wallet-topup", label: "شحن محفظة",   hint: "لأحد أفراد العائلة",  icon: Wallet },
    { key: "expense",      label: "تسجيل مصروف", hint: "تصنيف منزلي",         icon: Receipt },
  ],
  global: [
    NEW_PRODUCT,
    { key: "expense",          label: "إضافة مصروف",   hint: "متعدد المساحات",   icon: Receipt },
    { key: "supplier-collect", label: "تحصيل من مورد", hint: "أي مساحة",         icon: HandCoins },
    { key: "stock-in",         label: "استلام مخزون",  hint: "أي متجر",          icon: PackagePlus },
  ],
};

export function SmartActionComposer() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Action | null>(null);
  const { activeWorkspaceKind } = useSovereignContext();
  const actions = ACTIONS_BY_KIND[activeWorkspaceKind] ?? ACTIONS_BY_KIND.global;

  function close() {
    setOpen(false);
    setTimeout(() => setPicked(null), 150);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="إضافة سريعة"
        className={cn(
          "fixed z-40 lg:hidden bottom-24 right-4",
          "h-14 w-14 rounded-2xl bg-gradient-primary text-primary-foreground",
          "shadow-glow flex items-center justify-center press transition-base",
        )}
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>
      <button
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
      </button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent dir="rtl" className="sm:max-w-md rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              {picked ? (
                <button onClick={() => setPicked(null)} className="text-foreground-tertiary press" aria-label="رجوع">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : <span />}
              <DialogTitle className="font-display text-[18px]">
                {picked ? picked.label : "ماذا تريد أن تسجل؟"}
              </DialogTitle>
              <button onClick={close} className="text-foreground-tertiary press" aria-label="إغلاق">
                <X className="h-5 w-5" />
              </button>
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
                    <button
                      type="button"
                      onClick={() => setPicked(a)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-2xl",
                        "bg-surface-muted/60 hover:bg-surface-muted border border-border/40",
                        "text-right press transition-base",
                      )}
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <a.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold leading-tight">{a.label}</p>
                        <p className="text-[11.5px] text-foreground-tertiary leading-tight mt-0.5">{a.hint}</p>
                      </div>
                    </button>
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
                <button
                  onClick={close}
                  className="mt-5 h-11 px-6 rounded-xl bg-foreground text-background text-[12.5px] font-semibold press"
                >
                  حسنًا
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SmartActionComposer;
