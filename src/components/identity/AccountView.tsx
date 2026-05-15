import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { toLatin } from "@/lib/format";
import { getMyAccountHubFn } from "@/core/identity/user.functions";
import { tierProgress } from "@/lib/tiers";
import { useUserRoles } from "@/hooks/useUserRoles";
import { formatCustomerId } from "@/apps/reef-al-madina/features/account/lib/customerId";
import AccountActionGrid from "@/apps/reef-al-madina/features/account/components/AccountActionGrid";
import AccountTierCard from "@/apps/reef-al-madina/features/account/components/AccountTierCard";
import AccountWalletRail from "@/apps/reef-al-madina/features/account/components/AccountWalletRail";
import AccountSettingRow from "@/apps/reef-al-madina/features/account/components/AccountSettingRow";
import { SETTING_GROUPS } from "@/apps/reef-al-madina/features/account/data";
import { Tracer } from "@/core/system/observability/Tracer";

const formatPhone = (raw: string): string => {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("20") && d.length >= 11) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
  return `+${d}`;
};

type KycStatus = "pending" | "verified" | "rejected" | null;

const Account = () => {
  const { resolvedMode } = useTheme();
  const { user, profile, signOut, isInitializing } = useAuth();
  const { roles } = useUserRoles();
  const nav = useNavigate();
  const [points, setPoints] = useState(0);
  const [balance, setBalance] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [kycStatus, setKycStatus] = useState<KycStatus>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const hub = await getMyAccountHubFn();
        if (!alive) return;
        setPoints(hub.points);
        setBalance(hub.balance);
        setOrdersCount(hub.ordersCount);
        setTotalSpent(hub.totalSpent);
        setKycStatus(hub.kycStatus);
      } catch (e) {
        Tracer.error("identity", "account_hub_load_error", { args: ["account hub load error", e] });
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("تم تسجيل الخروج");
    nav({ to: "/auth", replace: true });
  };

  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string };
    return profile?.full_name || meta.full_name || "عضو ريف";
  }, [profile, user]);
  const displayPhone = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { phone?: string };
    return formatPhone(profile?.phone || meta.phone || "");
  }, [profile, user]);

  if (isInitializing) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">جاري تحميل بيانات الحساب...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold">حسابي</h1>
        <div className="glass-strong rounded-3xl p-8 text-center shadow-soft">
          <p className="text-sm text-muted-foreground mb-4">سجّل الدخول لتتابع طلباتك ومحفظتك</p>
          <Link to="/auth" className="inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-pill">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("") || "ر م";
  const progress = tierProgress(totalSpent);
  const isVerified = kycStatus === "verified";

  const verifyBadge = isVerified
    ? { tone: "success" as const, label: "موثّق" }
    : kycStatus === "pending"
    ? { tone: "warning" as const, label: "قيد المراجعة" }
    : !kycStatus
    ? { tone: "info" as const, label: "جديد" }
    : null;

  return (
    <div className="space-y-6 pb-2">
      <header>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">حسابي</h1>
        <p className="mt-1 text-xs text-muted-foreground">لوحة قيادة فاخرة لإدارة بياناتك ومكافآتك.</p>
      </header>

      <AccountActionGrid />

      <AccountTierCard
        tierKey={progress.tier.key}
        tierLabel={progress.tier.label}
        TierIcon={progress.tier.icon}
        multiplier={progress.tier.multiplier}
        pct={progress.pct}
        remaining={progress.remaining}
        nextLabel={progress.next?.label ?? null}
        displayName={displayName}
        displayPhone={displayPhone}
        initials={initials}
        isVerified={isVerified}
        points={points}
        balance={balance}
        ordersCount={ordersCount}
        roles={roles}
        customerId={formatCustomerId(user.id)}
      />

      <AccountWalletRail balance={balance} points={points} />

      {SETTING_GROUPS.map((g) => (
        <section key={g.title} className="space-y-2">
          <h3 className="px-2 text-[11px] font-extrabold text-muted-foreground tracking-wider">{g.title}</h3>
          <div className="overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-border/60 divide-y divide-border/60">
            {g.items.map((item) => (
              <AccountSettingRow
                key={item.label}
                item={item}
                badge={item.to === "/account/verification" ? verifyBadge : null}
              />
            ))}
          </div>
        </section>
      ))}

      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-right shadow-soft ring-1 ring-border/60"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
          <LogOut className="h-4 w-4 text-destructive" strokeWidth={2.4} />
        </div>
        <span className="flex-1 text-sm font-bold text-destructive">تسجيل الخروج</span>
      </button>
      <p className="pt-4 text-center text-[10px] text-muted-foreground tabular-nums">
        ريف المدينة · الإصدار 1.0.0 · الوضع: {resolvedMode === "dark" ? "داكن" : "فاتح"}
      </p>
    </div>
  );
};

export default Account;
