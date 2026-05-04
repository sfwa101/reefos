import { useRef } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import TopBar from "@/components/TopBar";
import TabBar from "@/components/TabBar";
import SectionsPanel from "@/components/desktop/SectionsPanel";
import CartPanel from "@/components/desktop/CartPanel";
import GlobalApprovalBanner from "@/components/GlobalApprovalBanner";
import { useCartLines } from "@/context/CartContext";
import { useHakimEdgeWorker } from "@/features/hakim/hooks/useHakimEdgeWorker";

// Routes where the bottom TabBar should be HIDDEN to make room for a sticky CTA.
const HIDE_TABBAR_ROUTES = [
  "/store/recipes",
  "/product/", // any product detail
  "/cart",
];

const AppShell = () => {
  const { pathname } = useLocation();
  const hideTabBar = HIDE_TABBAR_ROUTES.some((p) =>
    p.endsWith("/") ? pathname.startsWith(p) : pathname === p
  );
  // Hide desktop cart panel on the cart page itself (avoid duplicate cart UI).
  const hideCartPanel = pathname === "/cart" || pathname === "/auth";

  // Hakim edge agent — local-first monitoring, zero external LLM calls.
  const cartLines = useCartLines();
  const cartUpdatedAtRef = useRef<number>(Date.now());
  const cartSnapshotRef = useRef<string>("");
  const sig = cartLines.map((l) => `${l.product.id}x${l.qty}`).join("|");
  if (sig !== cartSnapshotRef.current) {
    cartSnapshotRef.current = sig;
    cartUpdatedAtRef.current = Date.now();
  }
  useHakimEdgeWorker({
    getCart: () => ({
      items: cartLines.map((l) => ({ id: l.product.id, quantity: l.qty })),
      updatedAt: cartUpdatedAtRef.current,
    }),
  });

  return (
    <div className="relative min-h-screen bg-background text-foreground [overflow-x:clip]">
      <GlobalApprovalBanner />
      <TopBar />
      <div className="mx-auto flex w-full max-w-[1400px] gap-5 px-0 pt-[96px] lg:gap-6 lg:px-6 lg:pt-[112px]">
        <SectionsPanel />
        <main
          className={`mx-auto w-full max-w-md flex-1 sm:max-w-2xl md:max-w-4xl lg:mx-0 lg:max-w-none lg:min-w-0 ${hideTabBar ? "pb-[120px]" : "pb-28"} lg:pb-10`}
        >
          <Outlet />
        </main>
        {!hideCartPanel && <CartPanel />}
      </div>
      {!hideTabBar && <TabBar />}
    </div>
  );
};

export default AppShell;