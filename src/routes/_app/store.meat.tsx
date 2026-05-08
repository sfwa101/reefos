import { createFileRoute } from "@tanstack/react-router";
import SduiCategoryPage from "@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage";

export const Route = createFileRoute("/_app/store/meat")({
  component: () => (
    <SduiCategoryPage themeKey="meat" pageKey="category_meat" title="اللحوم" />
  ),
});
