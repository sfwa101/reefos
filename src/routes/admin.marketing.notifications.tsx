import { createFileRoute } from "@tanstack/react-router";
import NotificationsPage from "@/components/admin/views/Notifications";

export const Route = createFileRoute("/admin/marketing/notifications")({
  component: NotificationsPage,
});
