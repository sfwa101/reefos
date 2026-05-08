import { createFileRoute } from "@tanstack/react-router";
import SduiCategoryPage from "@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage";

export const Route = createFileRoute("/_app/store/subscription")({
  component: () => (
    <SduiCategoryPage themeKey="subscriptions" pageKey="category_subscriptions" title="الاشتراكات" />
  ),
});
