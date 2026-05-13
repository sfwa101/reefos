import { createFileRoute } from "@tanstack/react-router";
import VendorProducts from "@/components/vendor/views/VendorProducts";
export const Route = createFileRoute("/vendor/products")({ component: VendorProducts });
