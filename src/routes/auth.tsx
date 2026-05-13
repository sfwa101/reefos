import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/components/auth/AuthView";
export const Route = createFileRoute("/auth")({ component: Auth });
