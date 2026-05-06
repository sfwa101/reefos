import { createFileRoute } from "@tanstack/react-router";
import { lazyPage } from "@/routes/-lazyRoute";

const Sections = lazyPage(() => import("@/pages/Sections"));
export const Route = createFileRoute("/_app/sections")({ component: Sections });
