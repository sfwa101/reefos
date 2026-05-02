import { createFileRoute } from "@tanstack/react-router";
import ProductBatches from "@/pages/admin/ProductBatches";
export const Route = createFileRoute("/admin/product-batches")({ component: ProductBatches });
