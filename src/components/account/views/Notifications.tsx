import { useEffect, useState } from "react";
import BackHeader from "@/components/BackHeader";
import { Bell, Tag, Truck, Sparkles, Gift, Loader2, CheckCheck, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listMyNotificationsFn, markAllNotificationsReadFn } from "@/core/identity/user.functions";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tracer } from "@/core/system/observability/Tracer";
import { Button } from "@/components/ui/button";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  icon: string | null;
  read: boolean;
  created_at: string;
};

const iconMap: Record<string, LucideIcon> = {
  gift: Gift, tag: Tag, truck: Truck, sparkles: Sparkles, bell: Bell,
};

const prefsDefaults = { promos: true, orders: true, news: false, stock: true };

const Notifications = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(() => {
    try { return { ...prefsDefaults, ...JSON.parse(localStorage.getItem("reef-notif-prefs") || "{}") }; }
    catch { return prefsDefaults; }
  });

  const load = async () => {
    if (!user) return;
    try {
      const data = await listMyNotificationsFn();
      setList(data as Notif[]);
    } catch (e) {
      Tracer.error("account", "notifications_load_error", { args: ["notifications load error", e] });
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const togglePref = (k: keyof typeof prefsDefaults) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    localStorage.setItem("reef-notif-prefs", JSON.stringify(next));
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsReadFn();
      toast.success("تم تعليم الكل كمقروء");
      load();
    } catch (e) {
      const m = e instanceof Error ? e.message : "تعذّر التحديث";
      toast.error(m);
    }
  };

  return (
    <div className="space-y-5">
      <BackHeader title="التنبيهات" subtitle="آخر التحديثات والعروض" accent="حسابي" />

      {/* Notifications list */}
      <section>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="text-xs font-bold text-muted-foreground">الإشعارات</h3>
          {list.some((n) => !n.read) && (
            <Button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <CheckCheck className="h-3 w-3" /> تعليم الكل
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <div className="glass-strong rounded-2xl p-8 text-center text-sm text-muted-foreground shadow-soft">
            لا توجد إشعارات حالياً
          </div>
        ) : (
          <div className="glass-strong divide-y divide-border rounded-2xl shadow-soft">
            {list.map((n) => {
              const Icon = iconMap[n.icon ?? "bell"] ?? Bell;
              return (
                <div key={n.id} className={`flex items-start gap-3 p-4 ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft">
                    <Icon className="h-4 w-4 text-primary" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                      {new Date(n.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!n.read && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Preferences */}
      <section>
        <h3 className="mb-2 px-1 text-xs font-bold text-muted-foreground">تفضيلات الإشعارات</h3>
        <div className="glass-strong divide-y divide-border rounded-2xl shadow-soft">
          {[
            { id: "promos" as const, icon: Tag, label: "العروض والخصومات", sub: "تنبيهات أسبوعية" },
            { id: "orders" as const, icon: Truck, label: "حالة الطلب", sub: "تتبع التسليم" },
            { id: "news" as const, icon: Sparkles, label: "وصل حديثًا", sub: "منتجات جديدة" },
            { id: "stock" as const, icon: Bell, label: "تنبيهات التوفر", sub: "عند رجوع منتج" },
          ].map((o) => {
            const Icon = o.icon;
            const checked = !!prefs[o.id];
            return (
              <div key={o.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={2.4} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{o.label}</p>
                  <p className="text-[10px] text-muted-foreground">{o.sub}</p>
                </div>
                <Switch checked={checked} onCheckedChange={() => togglePref(o.id)} aria-label={o.label} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Notifications;
