import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const SubCategory = lazyPage(() => import("@/components/catalog/SubCategoryView"));
export const Route = createFileRoute("/_app/sub/$slug")({ component: SubCategory });
