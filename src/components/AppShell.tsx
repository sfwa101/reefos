import { useCallback, useEffect, useMemo, useRef } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import TopBar from "@/components/TopBar";
import TabBar from "@/components/TabBar";
import SectionsPanel from "@/components/desktop/SectionsPanel";
import CartPanel from "@/components/desktop/CartPanel";
import GlobalApprovalBanner from "@/components/GlobalApprovalBanner";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import { useCartLines } from "@/core/orders/runtime/react/CartProvider";
import { useHakimEdgeWorker } from "@/core/hakim-ai/hooks/useHakimEdgeWorker";

// Routes where the bottom TabBar should be HIDDEN to make room for a sticky CTA.
const HIDE_TABBAR_ROUTES = [
  "/store/recipes",
  "/product/", // any product detail
  "/cart",
];

const AppShell = () => {
  const queryClient = useQueryClient();

  // Scorched Earth ghost purge — runs once per browser to flush cached
  // pre-purge catalog payloads from localStorage + TanStack Query.
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const KEY = "ghost_purge_v1";
      if (localStorage.getItem(KEY)) return;
      localStorage.clear();
      queryClient.clear();
      localStorage.setItem(KEY, "done");
      window.location.reload();
    } catch {
      /* sandboxed iframe — ignore */
    }
  }, [queryClient]);

  // Wave P-C (Payload Diet) — one-shot rescue: nuke any pre-diet cart
  // payload that ballooned past 1MB (typically inlined base64 product
  // images persisted into the bridge `product` field). Runs once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("reef-cart-v2");
      if (raw && raw.length > 1024 * 1024) {
        console.warn(
          "[AppShell] reef-cart-v2 exceeded 1MB (",
          raw.length,
          "bytes) — clearing to unfreeze the UI.",
        );
        localStorage.removeItem("reef-cart-v2");
      }
    } catch {
      /* sandboxed iframe — ignore */
    }
  }, []);

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
  const cartItemsRef = useRef<Array<{ id: string; quantity: number }>>([]);
  const sig = useMemo(
    () => cartLines.map((l) => `${l.product.id}x${l.qty}`).join("|"),
    [cartLines],
  );
  if (sig !== cartSnapshotRef.current) {
    cartSnapshotRef.current = sig;
    cartUpdatedAtRef.current = Date.now();
    cartItemsRef.current = cartLines.map((l) => ({
      id: l.product.id,
      quantity: l.qty,
    }));
  }
  // Stable identity — depends only on primitives, so the worker's
  // useEffect doesn't tear down its 30s interval on every render.
  const getCart = useCallback(
    () => ({
      items: cartItemsRef.current,
      updatedAt: cartUpdatedAtRef.current,
    }),
    [],
  );
  useHakimEdgeWorker({ getCart });

  return (
    <div className="relative min-h-screen bg-background text-foreground [overflow-x:clip]">
      <GlobalApprovalBanner />
      <TopBar />
      <div className="mx-auto flex w-full max-w-[1400px] gap-5 px-0 pt-[96px] lg:gap-6 lg:px-6 lg:pt-[112px]">
        <SectionsPanel />
        <main
          className={`mx-auto w-full max-w-md flex-1 px-4 sm:max-w-2xl md:max-w-4xl lg:mx-0 lg:max-w-none lg:min-w-0 lg:px-0 ${hideTabBar ? "pb-[120px]" : "pb-28"} lg:pb-10`}
        >
          <Outlet />
        </main>
        {!hideCartPanel && <CartPanel />}
      </div>
      {!hideTabBar && <TabBar />}
      <BarcodeScannerModal />
    </div>
  );
};

export default AppShell;