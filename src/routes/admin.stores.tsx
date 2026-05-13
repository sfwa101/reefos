import { createFileRoute } from "@tanstack/react-router";
import Stores from "@/components/admin/views/Stores";

export const Route = createFileRoute("/admin/stores")({ component: Stores });
