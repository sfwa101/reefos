import { createFileRoute } from "@tanstack/react-router";
import DriverShell from "@/components/driver/views/DriverShell";
export const Route = createFileRoute("/driver")({ component: DriverShell });
