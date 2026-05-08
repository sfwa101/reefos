import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";
import KycUpgradeGate from "@/core-os/capabilities/identity/KycUpgradeGate";

const Wallet = lazyPage(() => import("@/pages/Wallet"));

// Phase 19 — Wallet (Tayseer) is gated behind the Sovereign Soft-Wall.
// Level-1 Residents see the upgrade sheet; verified Citizens pass through.
const GatedWallet = () => (
  <KycUpgradeGate reason="المحفظة (تيسير)">
    <Wallet />
  </KycUpgradeGate>
);

export const Route = createFileRoute("/_app/wallet")({ component: GatedWallet });
