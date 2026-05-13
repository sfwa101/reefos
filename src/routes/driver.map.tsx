import { createFileRoute } from "@tanstack/react-router";
import DriverMap from "@/components/driver/views/DriverMap";
export const Route = createFileRoute("/driver/map")({ component: DriverMap });
