import { createFileRoute } from "@tanstack/react-router";
import SduiCategoryPage from "@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage";

export const Route = createFileRoute("/_app/store/village")({
  component: () => (
    <SduiCategoryPage themeKey="village" pageKey="category_village" title="القرية" />
  ),
});
