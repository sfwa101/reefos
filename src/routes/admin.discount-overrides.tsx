import { createFileRoute } from "@tanstack/react-router";
import DiscountOverrides from "@/components/admin/views/DiscountOverrides";
export const Route = createFileRoute("/admin/discount-overrides")({ component: DiscountOverrides });
