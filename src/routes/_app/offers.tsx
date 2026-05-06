import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const Offers = lazyPage(() => import("@/pages/Offers"));
export const Route = createFileRoute("/_app/offers")({ component: Offers });
