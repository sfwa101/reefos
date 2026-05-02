import { createFileRoute } from "@tanstack/react-router";
import InventoryLocations from "@/pages/admin/InventoryLocations";
export const Route = createFileRoute("/admin/inventory-locations")({ component: InventoryLocations });
