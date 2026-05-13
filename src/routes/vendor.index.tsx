import { createFileRoute } from "@tanstack/react-router";
import VendorDashboard from "@/components/vendor/views/VendorDashboard";
export const Route = createFileRoute("/vendor/")({ component: VendorDashboard });
