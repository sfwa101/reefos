import { createFileRoute } from "@tanstack/react-router";
import DriverWallet from "@/components/driver/views/DriverWallet";
export const Route = createFileRoute("/driver/wallet")({ component: DriverWallet });
