import { createFileRoute } from "@tanstack/react-router";
import VendorCatalog from "@/components/vendor/views/VendorCatalog";
export const Route = createFileRoute("/vendor/catalog")({ component: VendorCatalog });
