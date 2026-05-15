import { useEffect, useState } from "react";
import { Store, Coins, Save } from "lucide-react";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getAppSettingsFn, upsertAppSettingFn } from "@/core/system/admin-settings.functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Settings Hub — /admin/settings
 * Tabbed key/value editor backed by `app_settings` table.
 */

type GeneralSettings = { store_name: string; logo_url: string; default_currency: string };
type FinanceSettings = { tax_pct: number; default_shipping: number; min_order_total: number };

const DEFAULT_GENERAL: GeneralSettings = { store_name: "", logo_url: "", default_currency: "EGP" };
const DEFAULT_FINANCE: FinanceSettings = { tax_pct: 14, default_shipping: 25, min_order_total: 50 };

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-foreground-secondary block mb-1.5">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-foreground-tertiary block mt-1">{hint}</span>}
    </label>
  );
}

function inputCls() {
  return "w-full bg-surface border border-border/50 rounded-2xl px-4 py-2.5 text-[13.5px] outline-none focus:border-primary/50 transition";
}

export default function Settings() {
  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [finance, setFinance] = useState<FinanceSettings>(DEFAULT_FINANCE);
  const [loading, setLoading] = useState(true);
  const [savingTab, setSavingTab] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bundle = await getAppSettingsFn({ data: { keys: ["general", "finance"] } });
        if (cancelled) return;
        const g = bundle.general as Partial<GeneralSettings> | undefined;
        const f = bundle.finance as Partial<FinanceSettings> | undefined;
        if (g) setGeneral({ ...DEFAULT_GENERAL, ...g });
        if (f) setFinance({ ...DEFAULT_FINANCE, ...f });
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function save(key: "general" | "finance", value: object) {
    setSavingTab(key);
    try {
      await upsertAppSettingFn({ data: { key, value: value as Record<string, unknown> } });
      toast.success("تم الحفظ بنجاح");
    } catch (err) {
      toast.error("فشل الحفظ: " + (err as Error).message);
    } finally {
      setSavingTab(null);
    }
  }


  return (
    <>
      <MobileTopbar title="الإعدادات" />

      <div className="hidden lg:block px-6 pt-8 pb-3 max-w-[1200px] mx-auto">
        <h1 className="font-display text-[30px] tracking-tight">الإعدادات</h1>
        <p className="text-[13px] text-foreground-secondary mt-1">
          تخصيص هوية المتجر والمعايير المالية والتشغيلية
        </p>
      </div>

      <div className="px-4 lg:px-6 pt-3 pb-10 max-w-[1200px] mx-auto">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-surface border border-border/50 p-1 shadow-soft">
            <TabsTrigger value="general" className="rounded-xl text-[12.5px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Store className="h-3.5 w-3.5 ml-1.5 inline -mt-0.5" />
              إعدادات عامة
            </TabsTrigger>
            <TabsTrigger value="finance" className="rounded-xl text-[12.5px] font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Coins className="h-3.5 w-3.5 ml-1.5 inline -mt-0.5" />
              مالية وتشغيل
            </TabsTrigger>
          </TabsList>

          {/* ---------- General ---------- */}
          <TabsContent value="general" className="mt-5">
            <section className="bg-surface rounded-3xl border border-border/50 shadow-soft p-5 space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </>
              ) : (
                <>
                  <Field label="اسم المتجر">
                    <Input
                      type="text"
                      value={general.store_name}
                      onChange={(e) => setGeneral({ ...general, store_name: e.target.value })}
                      placeholder="مثلاً: ريفام"
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="رابط الشعار (Logo URL)" hint="يظهر في رأس التطبيق وعلى الفواتير">
                    <Input
                      type="url"
                      value={general.logo_url}
                      onChange={(e) => setGeneral({ ...general, logo_url: e.target.value })}
                      placeholder="https://..."
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="العملة الافتراضية">
                    <select
                      value={general.default_currency}
                      onChange={(e) => setGeneral({ ...general, default_currency: e.target.value })}
                      className={inputCls()}
                    >
                      <option value="EGP">جنيه مصري (EGP)</option>
                      <option value="SAR">ريال سعودي (SAR)</option>
                      <option value="AED">درهم إماراتي (AED)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                    </select>
                  </Field>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => save("general", general)}
                      disabled={savingTab === "general"}
                      className="press inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl px-5 py-2.5 text-[13px] font-bold shadow-soft disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingTab === "general" ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                    </Button>
                  </div>
                </>
              )}
            </section>
          </TabsContent>

          {/* ---------- Finance ---------- */}
          <TabsContent value="finance" className="mt-5">
            <section className="bg-surface rounded-3xl border border-border/50 shadow-soft p-5 space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </>
              ) : (
                <>
                  <Field label="نسبة الضريبة (٪)" hint="تُطبق على الفواتير تلقائياً">
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      max={100}
                      value={finance.tax_pct}
                      onChange={(e) => setFinance({ ...finance, tax_pct: Number(e.target.value) })}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="مصاريف الشحن الافتراضية" hint="بالعملة المحددة في الإعدادات العامة">
                    <Input
                      type="number"
                      step="1"
                      min={0}
                      value={finance.default_shipping}
                      onChange={(e) => setFinance({ ...finance, default_shipping: Number(e.target.value) })}
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="الحد الأدنى لقيمة الطلب" hint="لن يتمكن العميل من إتمام طلب أقل من هذه القيمة">
                    <Input
                      type="number"
                      step="1"
                      min={0}
                      value={finance.min_order_total}
                      onChange={(e) => setFinance({ ...finance, min_order_total: Number(e.target.value) })}
                      className={inputCls()}
                    />
                  </Field>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => save("finance", finance)}
                      disabled={savingTab === "finance"}
                      className="press inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl px-5 py-2.5 text-[13px] font-bold shadow-soft disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {savingTab === "finance" ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                    </Button>
                  </div>
                </>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
