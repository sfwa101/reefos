import { createFileRoute } from "@tanstack/react-router";
import PurchaseInvoices from "@/components/admin/views/PurchaseInvoices";
export const Route = createFileRoute("/admin/purchases")({ component: PurchaseInvoices });
