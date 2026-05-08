import { createFileRoute } from "@tanstack/react-router";
import VendorCatalog from "@/pages/vendor/VendorCatalog";
export const Route = createFileRoute("/vendor/catalog")({ component: VendorCatalog });
