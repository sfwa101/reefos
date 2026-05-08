import { createFileRoute } from "@tanstack/react-router";
import SduiCategoryPage from "@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage";

export const Route = createFileRoute("/_app/store/supermarket")({
  component: () => (
    <SduiCategoryPage themeKey="supermarket" pageKey="category_supermarket" title="السوبرماركت" />
  ),
});
