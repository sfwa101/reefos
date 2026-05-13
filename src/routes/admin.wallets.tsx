import { createFileRoute } from "@tanstack/react-router";
import AdminWallets from "@/components/admin/views/Wallets";
export const Route = createFileRoute("/admin/wallets")({ component: AdminWallets });
