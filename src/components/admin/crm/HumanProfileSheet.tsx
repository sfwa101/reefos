/**
 * Phase 66.3 — Sovereign Human 360° Profile Sheet.
 *
 * 90vw / 90vh Command Modal. Single read via `get_human_360` RPC. Renders
 * identity rail + tabbed facets. Capability-gated tabs; missing facets
 * become "Promote to ..." actions instead of blank panes.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Phone, MapPin, ShieldCheck, Sparkles, UserPlus, Wallet, Receipt, Users, KeyRound } from "lucide-react";
import { getHuman360Fn, type Human360Result } from "@/core/crm/crm.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { fmtMoney, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Human360 = Human360Result;

const CHIP_STYLES: Record<string, string> = {
  customer: "bg-info/10 text-info border-info/20",
  vendor: "bg-primary/10 text-primary border-primary/20",
  partner: "bg-warning/10 text-warning border-warning/20",
  staff: "bg-success/10 text-success border-success/20",
  workspace_member: "bg-muted text-foreground-secondary border-border/40",
};
const CHIP_LABELS: Record<string, string> = {
  customer: "عميل", vendor: "تاجر", partner: "شريك", staff: "موظف", workspace_member: "عضو مساحة",
};

export function HumanProfileSheet({
  profileId, open, onOpenChange,
}: { profileId: string | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [data, setData] = useState<Human360 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchHuman = useServerFn(getHuman360Fn);

  useEffect(() => {
    if (!open || !profileId) return;
    setLoading(true); setError(null); setData(null);
    void (async () => {
      try {
        const res = await fetchHuman({ data: { profileId } });
        setData(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="p-0 overflow-hidden border-border/40 bg-background"
        style={{ width: "90vw", maxWidth: "90vw", height: "90vh", maxHeight: "90vh" }}
      >
        <DialogHeader className="sr-only"><DialogTitle>الملف البشري الموحّد</DialogTitle></DialogHeader>
        {loading && (
          <div className="flex-1 flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="p-10 text-center text-destructive text-[13px]">{error}</div>
        )}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] h-full">
            {/* LEFT RAIL — Identity */}
            <aside className="border-l border-border/40 bg-surface p-5 overflow-y-auto">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-3">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[24px] font-display">
                    {(data.identity.full_name ?? "؟").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-display text-[20px] leading-tight">{data.identity.full_name ?? "بدون اسم"}</h2>
                {data.identity.phone && (
                  <p className="text-[12px] text-foreground-tertiary mt-1 flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {data.identity.phone}
                  </p>
                )}
                {(data.identity.city || data.identity.governorate) && (
                  <p className="text-[11px] text-foreground-tertiary mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> {[data.identity.city, data.identity.governorate].filter(Boolean).join(" — ")}
                  </p>
                )}
                {data.identity.is_kyc_verified && (
                  <Badge variant="outline" className="mt-3 bg-success/10 text-success border-success/20">
                    <ShieldCheck className="h-3 w-3 ml-1" /> موثّق
                  </Badge>
                )}
              </div>

              <div className="mt-5">
                <p className="text-[11px] font-semibold text-foreground-tertiary mb-2">العلاقات</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.relationships.length === 0 && (
                    <span className="text-[11px] text-foreground-tertiary">لا توجد علاقات نشطة</span>
                  )}
                  {data.relationships.map((k) => (
                    <span key={k} className={cn("text-[11px] px-2 py-1 rounded-lg border", CHIP_STYLES[k] ?? CHIP_STYLES.workspace_member)}>
                      {CHIP_LABELS[k] ?? k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-center">
                <Stat label="إنفاق العمر" value={fmtMoney(data.customer.lifetime_spend)} />
                <Stat label="نقاط الولاء" value={fmtNum(data.customer.loyalty_points)} />
                <Stat label="رصيد التاجر" value={fmtMoney(data.vendor.wallet_available)} />
                <Stat label="سلف مفتوحة" value={fmtMoney(data.staff.open_advance_total)} />
              </div>
            </aside>

            {/* RIGHT SURFACE — Tabs */}
            <main className="overflow-y-auto p-5">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                  <TabsTrigger value="overview">نظرة</TabsTrigger>
                  <TabsTrigger value="customer">عميل</TabsTrigger>
                  <TabsTrigger value="vendor">تاجر</TabsTrigger>
                  <TabsTrigger value="staff">موظف</TabsTrigger>
                  <TabsTrigger value="caps">صلاحيات</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <Section title="رؤى حكيم" icon={Sparkles}>
                    <p className="text-[13px] text-foreground-secondary leading-relaxed">
                      {hakimSummary(data)}
                    </p>
                  </Section>
                </TabsContent>

                <TabsContent value="customer" className="mt-4">
                  <Section title="ملف العميل" icon={Receipt}>
                    <div className="grid grid-cols-3 gap-3">
                      <Stat label="إنفاق العمر" value={fmtMoney(data.customer.lifetime_spend)} />
                      <Stat label="نقاط الولاء" value={fmtNum(data.customer.loyalty_points)} />
                      <Stat label="الدرجة" value={data.customer.loyalty_tier} />
                    </div>
                  </Section>
                </TabsContent>

                <TabsContent value="vendor" className="mt-4">
                  {data.vendor.legacy_vendors.length === 0 && data.vendor.salsabil_memberships.length === 0 ? (
                    <PromoteCard
                      icon={UserPlus}
                      title="هذا الإنسان ليس تاجراً"
                      subtitle="يمكنك ترقيته إلى تاجر دروبشيب أو ضمّه إلى مساحة تاجر فيدرالية."
                      cta="ترقية إلى تاجر"
                    />
                  ) : (
                    <Section title="عضويات التاجر" icon={Wallet}>
                      <ul className="space-y-2">
                        {data.vendor.salsabil_memberships.map((m) => (
                          <Row key={m.vendor_id} title={m.business_name} subtitle={`دور: ${m.role}`} active={m.is_active} />
                        ))}
                        {data.vendor.legacy_vendors.map((v) => (
                          <Row key={v.id} title={v.name} subtitle={`${v.type} • عمولة ${v.commission_pct}%`} active={v.is_active} />
                        ))}
                      </ul>
                    </Section>
                  )}
                </TabsContent>

                <TabsContent value="staff" className="mt-4">
                  {data.staff.roles.length === 0 ? (
                    <PromoteCard
                      icon={Users}
                      title="هذا الإنسان ليس موظفاً"
                      subtitle="يمكنك تعيين دور وظيفي وفرع أساسي."
                      cta="تعيين دور موظف"
                    />
                  ) : (
                    <>
                      <Section title="الأدوار الوظيفية" icon={Users}>
                        <ul className="space-y-2">
                          {data.staff.roles.map((r) => (
                            <Row key={r.role} title={r.role} subtitle={r.branch_id ? `فرع: ${r.branch_id.slice(0, 8)}` : "بدون فرع"} active={r.is_active} />
                          ))}
                        </ul>
                      </Section>
                      {data.staff.open_advances.length > 0 && (
                        <Section title="سلف مفتوحة" icon={Receipt}>
                          <ul className="space-y-2">
                            {data.staff.open_advances.map((a) => (
                              <Row key={a.id} title={a.kind} subtitle={a.status} amount={fmtMoney(a.amount)} />
                            ))}
                          </ul>
                        </Section>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="caps" className="mt-4">
                  <Section title="الصلاحيات السياقية (المرحلة 65)" icon={KeyRound}>
                    {data.capabilities.length === 0 ? (
                      <p className="text-[13px] text-foreground-tertiary">لا توجد صلاحيات ممنوحة في أي مساحة.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {data.capabilities.map((c, i) => (
                          <li key={i} className="text-[12px] flex items-center justify-between bg-surface-muted rounded-lg px-3 py-2">
                            <span className="font-mono">{c.capability}</span>
                            <span className="text-foreground-tertiary">{c.workspace_kind ?? "—"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>
                </TabsContent>
              </Tabs>
            </main>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-muted rounded-xl p-2">
      <p className="font-display text-[14px] num">{value}</p>
      <p className="text-[10px] text-foreground-tertiary">{label}</p>
    </div>
  );
}
function Section({ title, icon: Icon, children }: { title: string; icon: typeof Sparkles; children: React.ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl p-4 border border-border/40 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <p className="font-display text-[14px]">{title}</p>
      </div>
      {children}
    </div>
  );
}
function Row({ title, subtitle, active, amount }: { title: string; subtitle: string; active?: boolean; amount?: string }) {
  return (
    <li className="flex items-center justify-between bg-surface-muted rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-[13px] font-medium truncate">{title}</p>
        <p className="text-[11px] text-foreground-tertiary truncate">{subtitle}</p>
      </div>
      {amount && <span className="font-display text-[13px] num">{amount}</span>}
      {active !== undefined && (
        <span className={cn("text-[10px] px-2 py-0.5 rounded-md", active ? "bg-success/10 text-success" : "bg-muted text-foreground-tertiary")}>
          {active ? "نشط" : "موقوف"}
        </span>
      )}
    </li>
  );
}
function PromoteCard({ icon: Icon, title, subtitle, cta }: { icon: typeof Sparkles; title: string; subtitle: string; cta: string }) {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary-glow/5 rounded-2xl p-6 border border-primary/20 text-center">
      <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-display text-[16px]">{title}</p>
      <p className="text-[12px] text-foreground-tertiary mt-1 mb-4">{subtitle}</p>
      <Button className="bg-primary text-primary-foreground rounded-xl h-10 px-5 text-[13px] font-semibold press" disabled>
        {cta} (قريباً)
      </Button>
    </div>
  );
}

function hakimSummary(d: Human360): string {
  const parts: string[] = [];
  if (d.customer.lifetime_spend > 0) {
    parts.push(`أنفق ${fmtMoney(d.customer.lifetime_spend)} عبر تاريخه — درجة ${d.customer.loyalty_tier}.`);
  }
  if (d.vendor.salsabil_memberships.length || d.vendor.legacy_vendors.length) {
    parts.push(`تاجر نشط في ${d.vendor.salsabil_memberships.length + d.vendor.legacy_vendors.length} كيان(ات)، رصيد متاح ${fmtMoney(d.vendor.wallet_available)}.`);
  }
  if (d.staff.roles.length) {
    parts.push(`موظف بـ ${d.staff.roles.length} دور(أدوار)${d.staff.open_advance_total > 0 ? `، عليه سلف مفتوحة ${fmtMoney(d.staff.open_advance_total)}` : ""}.`);
  }
  if (d.partner.amount_due > 0) {
    parts.push(`له مستحقات شراكة لم تُدفع: ${fmtMoney(d.partner.amount_due)}.`);
  }
  if (parts.length === 0) return "هذا الإنسان مسجَّل ولكن بلا نشاط ملحوظ بعد. ابدأ بإسناد دور أو تفعيل علاقة.";
  return parts.join(" ");
}
