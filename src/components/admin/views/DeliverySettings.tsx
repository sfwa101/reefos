import { useEffect, useState } from "react";
import { getDeliverySettingsFn, updateDeliverySettingsFn, type DeliverySettings as DS } from "@/core/ops/ops.functions";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { RoleGuard } from "@/components/admin/RoleGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type S = DS;

export default function DeliverySettings() {
  return (
    <RoleGuard roles={["admin"]}>
      <MobileTopbar title="إعدادات التوصيل" />
      <Inner />
    </RoleGuard>
  );
}

function Inner() {
  const [s, setS] = useState<S | null>(null);
  const [zoneInput, setZoneInput] = useState("");

  const load = async () => {
    try { setS(await getDeliverySettingsFn()); } catch (e) { toast.error((e as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const update = async (patch: Partial<S>) => {
    if (!s) return;
    try {
      await updateDeliverySettingsFn({ data: { id: s.id, patch } });
      setS({ ...s, ...patch });
      toast.success("تم الحفظ");
    } catch (e) { toast.error((e as Error).message); }
  };

  if (!s) return <p className="text-center py-8 text-foreground-tertiary">جارٍ التحميل…</p>;

  return (
    <div dir="rtl" className="p-4 max-w-2xl mx-auto space-y-3">
      <Card><CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-display text-[15px]">طلب باركود التحقق افتراضياً</p>
            <p className="text-[12px] text-foreground-tertiary">المندوب يجب أن يمسح باركود العميل لإنهاء التسليم</p>
          </div>
          <Switch checked={s.require_barcode_default} onCheckedChange={v => update({ require_barcode_default: v })} />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="font-display text-[15px]">تعطيل الباركود للطلبات السريعة</p>
            <p className="text-[12px] text-foreground-tertiary">Express orders تُسلَّم بـ GPS فقط</p>
          </div>
          <Switch checked={s.disable_barcode_for_express} onCheckedChange={v => update({ disable_barcode_for_express: v })} />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="font-display text-[15px]">إلزام GPS عند تعطيل الباركود</p>
            <p className="text-[12px] text-foreground-tertiary">دليل الموقع اللحظي عند التسليم</p>
          </div>
          <Switch checked={s.gps_proof_required_when_disabled} onCheckedChange={v => update({ gps_proof_required_when_disabled: v })} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4 space-y-3">
        <p className="font-display text-[15px]">المناطق القريبة (تعطيل الباركود فيها)</p>
        <div className="flex gap-2 flex-wrap">
          {s.disable_barcode_zones.map(z => (
            <Button key={z} onClick={() => update({ disable_barcode_zones: s.disable_barcode_zones.filter(x => x !== z) })}
              className="bg-muted hover:bg-destructive/10 hover:text-destructive rounded-md px-3 py-1 text-[12px]">
              {z} ✕
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="أضف منطقة" value={zoneInput} onChange={e => setZoneInput(e.target.value)} />
          <Button onClick={() => {
            if (!zoneInput) return;
            update({ disable_barcode_zones: [...s.disable_barcode_zones, zoneInput.trim()] });
            setZoneInput("");
          }}>إضافة</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}
