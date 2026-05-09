import { useState } from "react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useCapability } from "@/hooks/useCapability";
import { useSystemSetting, setSystemSetting } from "@/hooks/useSystemSettings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

export default function SystemSettings() {
  // Phase 65 — capability-driven (admin bypass).
  const { allowed: isAdmin, loading: rolesLoading } = useCapability("global.system.manage");

  const waCheckout = useSystemSetting<boolean>("enable_whatsapp_checkout", true);
  const [saving, setSaving] = useState<string | null>(null);

  const toggleWa = async (next: boolean) => {
    setSaving("wa");
    const ok = await setSystemSetting("enable_whatsapp_checkout", next);
    setSaving(null);
    if (!ok) {
      toast.error("تعذر حفظ الإعداد");
      return;
    }
    await waCheckout.refresh();
    toast.success(next ? "تم تفعيل إتمام الطلبات عبر واتساب" : "تم إيقاف واتساب — الطلبات ستُتمّ داخل التطبيق");
  };

  if (rolesLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );
  }
  if (!isAdmin) {
    return <div className="p-8 text-center text-destructive">للأدمن فقط</div>;
  }

  return (
    <>
      <MobileTopbar title="إعدادات النظام" />
      <div className="px-4 lg:px-6 pt-3 pb-6 max-w-3xl mx-auto space-y-4">
        <div className="bg-surface rounded-2xl p-4 border border-border/40 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base">مفاتيح التشغيل الديناميكية</h2>
            <p className="text-xs text-foreground-secondary mt-1 leading-relaxed">
              تتحكم هذه الإعدادات في سلوك التطبيق فوراً دون الحاجة إلى نشر جديد.
            </p>
          </div>
        </div>

        {/* WhatsApp Checkout Toggle */}
        <div className="bg-surface rounded-2xl p-4 border border-border/40 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(142_70%_45%)] to-[hsl(142_70%_35%)] text-white flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <Label className="font-display text-[15px] block">إتمام الطلبات عبر الواتساب</Label>
                <p className="text-[12px] text-foreground-tertiary mt-0.5 leading-relaxed">
                  عند الإيقاف يتم إتمام الطلب داخل التطبيق مباشرةً والانتقال لصفحة النجاح.
                </p>
              </div>
            </div>
            {saving === "wa" || waCheckout.loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-foreground-tertiary shrink-0" />
            ) : (
              <Switch
                checked={!!waCheckout.value}
                onCheckedChange={toggleWa}
                aria-label="تفعيل إتمام الطلبات عبر الواتساب"
              />
            )}
          </div>
          <div className="text-[11px] text-foreground-tertiary border-t border-border/40 pt-2">
            الحالة الحالية: <span className={waCheckout.value ? "text-success font-bold" : "text-destructive font-bold"}>
              {waCheckout.value ? "مُفعّل (الطلبات تُرسل لواتساب)" : "مُعطّل (إتمام داخل التطبيق)"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
