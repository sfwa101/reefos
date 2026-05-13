import { createFileRoute } from "@tanstack/react-router";
import PrintJobsAdmin from "@/components/admin/views/PrintJobs";
export const Route = createFileRoute("/admin/print-jobs")({
  component: PrintJobsAdmin,
});
