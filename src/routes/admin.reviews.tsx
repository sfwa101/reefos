import { createFileRoute } from "@tanstack/react-router";
import Reviews from "@/components/admin/views/Reviews";
export const Route = createFileRoute("/admin/reviews")({ component: Reviews });
