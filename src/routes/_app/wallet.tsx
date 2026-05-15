import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { lazyPage } from "@/routes/-lazyRoute";
import { useAuth } from "@/context/AuthContext";
import { useSovereignOverride } from "@/hooks/useSovereignOverride";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import { Button } from "@/components/ui/button";

const Wallet = lazyPage(() => import("@/components/finance/WalletView"));

const DISMISS_KEY = "tayseer:kyc-advisory:dismissed";

/**
 * Phase 52 — Progressive KYC.
 *
 * The rigid `KycUpgradeGate` (Phase 19) was demolished. Tayseer is the
 * customer's primary financial surface; locking the entire page behind a
 * binary KYC sheet was a UX-breaking violation of progressive disclosure.
 *
 * New posture:
 *   • Anyone signed in can view balance, top-up history, and basic features.
 *   • Unverified users see a small, dismissible advisory banner explaining
 *     that verification unlocks higher credit limits — but the page is fully
 *     usable without it.
 *   • Verified users see no banner at all.
 */
const ProgressiveKycBanner = () => {
  const { profile } = useAuth();
  const hasSovereignOverride = useSovereignOverride();
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);

  if (profile?.is_kyc_verified) return null;
  if (hasSovereignOverride) return null;
  if (dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  };

  return (
    <div
      dir="rtl"
      className="mx-3 mt-3 flex items-start gap-3 rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/15"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
      </div>
      <div className="flex-1 text-[12.5px] leading-relaxed">
        <div className="font-bold text-foreground">وثّق هويتك لرفع حد تيسير</div>
        <p className="mt-0.5 text-muted-foreground">
          محفظتك تعمل الآن بكامل الخصائص الأساسية. التوثيق اختياري ويفتح حدود
          ائتمان أعلى وميزات سيادية إضافية في المستقبل.
        </p>
      </div>
      <Button
        type="button"
        onClick={dismiss}
        aria-label="إخفاء"
        className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted/40"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

const WalletShell = () => (
  <>
    <ProgressiveKycBanner />
    <Wallet />
  </>
);

export const Route = createFileRoute("/_app/wallet")({
  // Auth gate — wallet exposes financial state, must redirect anon → /auth.
  beforeLoad: async ({ location }) => {
    const session = await IdentityGateway.getSession();
    if (!session) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href } as never,
      });
    }
  },
  component: WalletShell,
});
