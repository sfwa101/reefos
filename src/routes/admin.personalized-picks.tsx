import { createFileRoute } from "@tanstack/react-router";
import PersonalizedPicks from "@/pages/admin/PersonalizedPicks";
export const Route = createFileRoute("/admin/personalized-picks")({ component: PersonalizedPicks });
