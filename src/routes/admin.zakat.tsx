import { createFileRoute } from "@tanstack/react-router";
import Zakat from "@/components/admin/views/Zakat";
export const Route = createFileRoute("/admin/zakat")({ component: Zakat });
