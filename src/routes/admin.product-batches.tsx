import { createFileRoute } from "@tanstack/react-router";
import ProductBatches from "@/components/admin/views/ProductBatches";
export const Route = createFileRoute("/admin/product-batches")({ component: ProductBatches });
