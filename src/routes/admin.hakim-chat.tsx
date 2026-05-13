import { createFileRoute } from "@tanstack/react-router";
import HakimChat from "@/components/admin/views/HakimChat";
export const Route = createFileRoute("/admin/hakim-chat")({ component: HakimChat });
