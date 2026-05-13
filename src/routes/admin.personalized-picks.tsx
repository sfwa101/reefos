import { createFileRoute } from "@tanstack/react-router";
import PersonalizedPicks from "@/components/admin/views/PersonalizedPicks";
export const Route = createFileRoute("/admin/personalized-picks")({ component: PersonalizedPicks });
