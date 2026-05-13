import { createFileRoute } from "@tanstack/react-router";
import InventoryLocations from "@/components/admin/views/InventoryLocations";
export const Route = createFileRoute("/admin/inventory-locations")({ component: InventoryLocations });
