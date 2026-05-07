import { createFileRoute } from "@tanstack/react-router";
import KhalilHub from "@/apps/khalil/pages/Hub";

export const Route = createFileRoute("/khalil")({
  head: () => ({
    meta: [
      { title: "خليل — منصة سلسبيل" },
      { name: "description", content: "بوابة سلسبيل الموحّدة لكل التطبيقات." },
    ],
  }),
  component: KhalilHub,
});
