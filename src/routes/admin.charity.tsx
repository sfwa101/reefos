import { createFileRoute } from "@tanstack/react-router";
import Charity from "@/components/admin/views/Charity";
export const Route = createFileRoute("/admin/charity")({ component: Charity });
