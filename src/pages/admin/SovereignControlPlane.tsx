import { useEffect, useState } from "react";
import { ShieldAlert, CreditCard, Sparkles, Power, Loader2 } from "lucide-react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { Switch } from "@/components/ui/switch";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { useSystemSetting, setSystemSetting } from "@/hooks/useSystemSettings";
import { createTraceId, logSovereignEvent } from "@/lib/sovereignTracing";
import { toast } from "sonner";

/**
 * Sovereign Control Plane — Phase 38.
 * Admin-only kill switch matrix bound to public.app_settings JSONB rows.
 * Every toggle is also appended to the immutable event timeline.
 */
type SwitchKey = "system_maintenance" | "payments_enabled" | "ai_orchestration_enabled";

type SwitchDef = {
  key: SwitchKey;
  defaultValue: boolean;
  /** When true, "on = system healthy". When false, "on = system halted". */
  positivePolarity: boolean;
  title: string;
  desc: string;
  icon: typeof ShieldAlert;
  tone: string;
};

const SWITCHES: SwitchDef[] = [
  {
    key: "system_maintenance",
    defaultValue: false,
    positivePolarity: false,
    title: "وضع الصيانة العام",
    desc: "عند التفعيل: يتم حجب جميع المستخدمين غير الإداريين خلف شاشة الصيانة.",
    icon: ShieldAlert,
    tone: "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-300",
  },
  {
    key: "payments_enabled",
    defaultValue: true,
    positivePolarity: true,
    title: "تفعيل المدفوعات والـ Checkout",
    desc: "عند الإيقاف: تتعطل عمليات الدفع والمحفظة فوراً مع إشعار للمستخدم.",
    icon: CreditCard,
    tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300",
  },
  {
    key: "ai_orchestration_enabled",
    defaultValue: true,
    positivePolarity: true,
    title: "تفعيل أوركسترا الحكيم",
    desc: "عند الإيقاف: يعود التطبيق للـ SDUI الثابت من قاعدة البيانات بدون توليد ذكي.",
    icon: Sparkles,
    tone: "from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-300",
  },
];

function SwitchRow({ def }: { def: SwitchDef }) {
  const setting = useSystemSetting<boolean>(def.key, def.defaultValue);
  const [saving, setSaving] = useState(false);
  const Icon = def.icon;
  const armed = def.positivePolarity ? !setting.value : setting.value;

  const onToggle = async (next: boolean) => {
    setSaving(true);
    const ok = await setSystemSetting(def.key, next);
    if (!ok) {
      toast.error("فشل حفظ المفتاح");
      setSaving(false);
      return;
    }
    await setting.refresh();
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
    await logSovereignEvent({
      trace_id: createTraceId(),
      event_domain: "control_plane",
      event_type: "kill_switch_toggled",
      payload: { key: def.key, value: next },
    });
    setSaving(false);
    toast.success("تم تحديث المفتاح");
  };

  return (
    <div className="rounded-3xl border border-border/50 bg-surface p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${def.tone} grid place-items-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-[15px]">{def.title}</h3>
            {saving || setting.loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-foreground-tertiary" />
            ) : (
              <Switch checked={!!setting.value} onCheckedChange={onToggle} aria-label={def.title} />
            )}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-foreground-secondary">{def.desc}</p>
          {armed && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[10.5px] font-bold text-destructive">
              <Power className="h-3 w-3" /> الحالة: متوقف / مُفعَّل وضع الطوارئ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SovereignControlPlane() {
  const { hasRole, loading } = useAdminRoles();
  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (!isAdmin) return;
    void logSovereignEvent({
      trace_id: createTraceId(),
      event_domain: "control_plane",
      event_type: "panel_opened",
    });
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="p-10 text-center text-destructive font-bold">
        مخصص للمشرفين فقط (admin role required)
      </div>
    );
  }

  return (
    <>
      <MobileTopbar title="غرفة التحكم السيادية" />
      <div className="px-4 lg:px-6 pt-4 pb-10 max-w-3xl mx-auto space-y-4" dir="rtl">
        <div className="rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-surface to-surface p-5 shadow-soft">
          <h1 className="font-display text-[22px] tracking-tight">منظومة المفاتيح السيادية</h1>
          <p className="mt-1 text-[12.5px] text-foreground-secondary leading-relaxed">
            مفاتيح إيقاف فورية تتحكم بسلوك OS بأكمله. كل تبديل يُسجَّل في الـ Event Timeline الثابت.
          </p>
        </div>

        {SWITCHES.map((s) => (
          <SwitchRow key={s.key} def={s} />
        ))}

        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-4 text-[12px] text-amber-800 dark:text-amber-200 leading-relaxed">
          ⚠️ هذه المفاتيح تؤثر فوراً على جميع المستخدمين. استخدمها بحذر.
        </div>
      </div>
    </>
  );
}
