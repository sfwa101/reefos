import { createFileRoute } from "@tanstack/react-router";
import Partners from "@/components/admin/views/Partners";
export const Route = createFileRoute("/admin/partners")({ component: Partners });
