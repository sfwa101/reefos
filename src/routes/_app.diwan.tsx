import { createFileRoute } from "@tanstack/react-router";
import KhalilHub from "@/apps/khalil/pages/Hub";

export const Route = createFileRoute("/_app/diwan")({
  head: () => ({
    meta: [
      { title: "الديوان — منصة سلسبيل" },
      { name: "description", content: "بوابة الإمبراطورية الموحّدة لكل التطبيقات." },
    ],
  }),
  component: KhalilHub,
});
