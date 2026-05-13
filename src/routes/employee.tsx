import { createFileRoute } from "@tanstack/react-router";
import EmployeeHub from "@/components/identity/EmployeeHubView";
export const Route = createFileRoute("/employee")({ component: EmployeeHub });
