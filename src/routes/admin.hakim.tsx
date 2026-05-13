import { createFileRoute } from "@tanstack/react-router";
import HakimAdvisor from "@/components/admin/views/HakimAdvisor";
export const Route = createFileRoute("/admin/hakim")({ component: HakimAdvisor });
