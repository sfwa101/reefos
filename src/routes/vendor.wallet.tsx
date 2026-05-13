import { createFileRoute } from "@tanstack/react-router";
import VendorWallet from "@/components/vendor/views/VendorWallet";
export const Route = createFileRoute("/vendor/wallet")({ component: VendorWallet });
