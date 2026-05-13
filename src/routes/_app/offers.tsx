import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const Offers = lazyPage(() => import("@/components/marketing/OffersView"));
export const Route = createFileRoute("/_app/offers")({ component: Offers });
