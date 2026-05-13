import { createFileRoute } from "@tanstack/react-router";
import Kyc from "@/components/admin/views/Kyc";
export const Route = createFileRoute("/admin/kyc")({ component: Kyc });
