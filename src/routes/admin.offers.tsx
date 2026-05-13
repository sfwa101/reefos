import { createFileRoute } from "@tanstack/react-router";
import Offers from "@/components/admin/views/Offers";
export const Route = createFileRoute("/admin/offers")({ component: Offers });
