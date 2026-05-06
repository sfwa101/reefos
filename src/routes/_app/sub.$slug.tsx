import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const SubCategory = lazyPage(() => import("@/pages/SubCategory"));
export const Route = createFileRoute("/_app/sub/$slug")({ component: SubCategory });
