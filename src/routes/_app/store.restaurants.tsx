import { createFileRoute } from "@tanstack/react-router";
import SduiCategoryPage from "@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage";

export const Route = createFileRoute("/_app/store/restaurants")({
  component: () => (
    <SduiCategoryPage themeKey="restaurants" pageKey="category_restaurants" title="المطاعم" />
  ),
});
