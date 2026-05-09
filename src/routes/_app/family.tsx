import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const FamilyHub = lazyPage(() => import("@/pages/FamilyHub"));

export const Route = createFileRoute("/_app/family")({ component: FamilyHub });
