import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const RestaurantDetail = lazyPage(() => import("@/components/catalog/RestaurantDetailView"));
export const Route = createFileRoute("/_app/restaurant/$id")({ component: RestaurantDetail });
