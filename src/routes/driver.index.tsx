import { createFileRoute } from "@tanstack/react-router";
import DriverTasks from "@/components/driver/views/DriverTasks";
export const Route = createFileRoute("/driver/")({ component: DriverTasks });
