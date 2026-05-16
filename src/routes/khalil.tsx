import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

/**
 * Khalil — sovereign domain landing (Phase P0).
 *
 * The Khalil runtime is still under governance ratification
 * (`.salsabil/domains/khalil/`). This route exists so the App Switcher
 * notch resolves to a real surface instead of 404. It will be replaced
 * by the real Khalil shell once ADR-K-P1 lands.
 */
export const Route = createFileRoute("/khalil")({
  head: () => ({
    meta: [
      { title: "خليل — نظام التحول السيادي" },
      {
        name: "description",
        content: "خليل: نظام تشغيل سيادي للتحول الإنساني الموجَّه بالذكاء الاصطناعي داخل منظومة سلسبيل.",
      },
    ],
  }),
  component: KhalilLanding,
});

function KhalilLanding() {
  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-background pb-24 pt-20 text-foreground"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />

      <section className="relative mx-auto flex max-w-md flex-col items-center px-6 text-center">
        <span className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-soft ring-1 ring-white/20">
          <Sparkles className="h-7 w-7" strokeWidth={2.2} />
        </span>

        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          خليل
        </h1>
        <p className="mt-2 text-base font-semibold text-muted-foreground">
          نظام التحول السيادي الموجَّه بالذكاء
        </p>

        <p className="mt-6 text-sm leading-7 text-muted-foreground">
          خليل يُبنى الآن كتطبيق سيادي قائم بذاته داخل منظومة سلسبيل —
          هوية، انضباط، روحانية، صحة، وذكاء مرافق. الطور الحالي هو طور
          الحَوكَمة (P0): تثبيت الدستور والعقود قبل كتابة أي شيفرة منتج.
        </p>

        <div className="mt-8 w-full rounded-3xl bg-secondary/50 p-5 text-start ring-1 ring-border/40">
          <h2 className="font-display text-sm font-bold text-foreground">
            ما الذي يجري الآن؟
          </h2>
          <ul className="mt-3 space-y-2 text-[13px] leading-6 text-muted-foreground">
            <li>• ترسيخ مذكرة المجال في <code>.salsabil/domains/khalil/</code>.</li>
            <li>• تعريف القدرات والأحداث قبل البناء.</li>
            <li>• تثبيت فلسفة المرافق الذكي «اقترح ← قرّر».</li>
          </ul>
        </div>

        <Link
          to="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-soft transition active:scale-[0.97]"
        >
          العودة إلى ريف المدينة
        </Link>
      </section>
    </main>
  );
}
