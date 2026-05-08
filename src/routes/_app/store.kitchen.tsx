import { createFileRoute } from "@tanstack/react-router";
import SduiCategoryPage from "@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage";

export const Route = createFileRoute("/_app/store/kitchen")({
  component: () => (
    <SduiCategoryPage themeKey="kitchen" pageKey="category_kitchen" title="المطبخ الجاهز" />
  ),
});
