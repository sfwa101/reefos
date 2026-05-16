import { createFileRoute } from "@tanstack/react-router";
import MaeenHub from "@/apps/maeen/pages/Hub";

export const Route = createFileRoute("/_app/maeen")({
  head: () => ({
    meta: [
      { title: "معين — منصة سلسبيل" },
      { name: "description", content: "بوابة الإمبراطورية الموحّدة لكل التطبيقات." },
    ],
  }),
  component: MaeenHub,
});
