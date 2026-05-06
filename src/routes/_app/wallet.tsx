import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const Wallet = lazyPage(() => import("@/pages/Wallet"));
export const Route = createFileRoute("/_app/wallet")({ component: Wallet });
