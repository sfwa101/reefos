import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const FamilyHub = lazyPage(() => import("@/components/identity/FamilyHubView"));

export const Route = createFileRoute("/_app/family")({ component: FamilyHub });
