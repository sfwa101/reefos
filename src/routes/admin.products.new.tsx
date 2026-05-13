/**
 * Legacy redirect — Phase V-1.C.
 * The Modal-based product composer was replaced by the full-screen
 * Vision Genesis route (`/admin/assets/genesis`).
 */
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/products/new")({
  component: () => <Navigate to="/admin/assets/genesis" replace />,
});
