import { createFileRoute } from "@tanstack/react-router";
import CustomerDetail from "@/components/admin/views/CustomerDetail";

function CustomerDetailRoute() {
  const { customerId } = Route.useParams();
  return <CustomerDetail customerId={customerId} />;
}

export const Route = createFileRoute("/admin/customers/$customerId")({
  component: CustomerDetailRoute,
});
