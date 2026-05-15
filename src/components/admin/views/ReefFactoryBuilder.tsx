/**
 * ReefFactoryBuilder — WAVE UI-12 (Hakim Architect Wizard).
 *
 * 4-stage Steel Glass wizard that composes new "workspaces" inside Reef
 * Al Madina. UI-only for now: Hakim's blueprint is static mock data; no
 * supabase calls, no schema mutation. The wave focuses purely on the
 * Visual Composer and step transitions.
 */
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChefHat,
  CheckCircle2,
  CreditCard,
  Loader2,
  Printer,
  Rocket,
  ScanLine,
  Sparkles,
  Truck,
  WifiOff,
  Wand2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type StemCell = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof CreditCard;
  accent: string;
};

type ToggleModule = {
  id: string;
  label: string;
  description: string;
  icon: typeof WifiOff;
  defaultOn: boolean;
};

const STEPS = [
  { id: 1, key: "definition", label: "التعريف", icon: Wand2 },
  { id: 2, key: "blueprint", label: "مخطط حكيم", icon: Sparkles },
  { id: 3, key: "configuration", label: "الإعدادات", icon: Boxes },
  { id: 4, key: "deployment", label: "الإطلاق", icon: Rocket },
] as const;

// MOCK — Hakim AI response (will be wired to the AI Gateway in a later wave).
const MOCK_BLUEPRINT: StemCell[] = [
  {
    id: "pos",
    title: "خلية نقطة البيع (POS)",
    subtitle: "واجهة كاشير زجاجية مع باركود وفواتير لحظية.",
    icon: CreditCard,
    accent: "from-sky-500 to-blue-600",
  },
  {
    id: "kds",
    title: "شاشة المطبخ (KDS)",
    subtitle: "طابور أوامر الشواء مع مؤقتات تحضير ذكية.",
    icon: ChefHat,
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "inventory",
    title: "مخزون المشويات",
    subtitle: "تتبع كميات اللحوم والتوابل وتنبيه نفاد.",
    icon: Boxes,
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "delivery",
    title: "ربط السائقين",
    subtitle: "تخصيص أوامر التوصيل تلقائياً للسائق الأقرب.",
    icon: Truck,
    accent: "from-rose-500 to-pink-600",
  },
];

const MODULES: ToggleModule[] = [
  {
    id: "offline",
    label: "وضع عدم الاتصال",
    description: "متابعة العمل بدون إنترنت ومزامنة لاحقة.",
    icon: WifiOff,
    defaultOn: true,
  },
  {
    id: "printing",
    label: "طباعة الفواتير",
    description: "اتصال بطابعات الفواتير عبر USB أو Bluetooth.",
    icon: Printer,
    defaultOn: true,
  },
  {
    id: "waiter",
    label: "وضع النادل",
    description: "تخصيص الطلبات على الطاولات وتقسيم الفاتورة.",
    icon: Users,
    defaultOn: false,
  },
  {
    id: "scanner",
    label: "ماسح الباركود",
    description: "تكامل مع كاميرا الجهاز وماسحات USB.",
    icon: ScanLine,
    defaultOn: false,
  },
];

export function ReefFactoryBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState("");
  const [thinking, setThinking] = useState(false);
  const [blueprint, setBlueprint] = useState<StemCell[]>([]);
  const [modules, setModules] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULES.map((m) => [m.id, m.defaultOn])),
  );
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const goNext = async () => {
    if (step === 1) {
      if (brief.trim().length < 8) {
        toast.error("اكتب وصفاً أوضح لما تريد بناءه.");
        return;
      }
      setStep(2);
      setThinking(true);
      // Mock Hakim "thinking" state.
      await new Promise((r) => setTimeout(r, 1400));
      setBlueprint(MOCK_BLUEPRINT);
      setThinking(false);
      return;
    }
    if (step < 4) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const deploy = async () => {
    setDeploying(true);
    await new Promise((r) => setTimeout(r, 1200));
    setDeploying(false);
    setDeployed(true);
    toast.success("تم تهيئة بيئة العمل بنجاح 🎉");
    setTimeout(() => navigate({ to: "/admin/factory" }), 1400);
  };

  return (
    <div className="bg-mesh min-h-screen px-4 py-6 lg:px-8" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">
        <SectionHeader
          eyebrow="Reef · App Factory"
          title="مهندس حكيم — بناء واجهة جديدة"
          description="صف ما تحتاجه، ودع حكيم يقترح تركيبة الخلايا الجذعية المناسبة لك."
          action={
            <Button
              asChild
              variant="ghost"
              className="rounded-2xl border border-white/40 bg-white/40 px-3 text-[12.5px] font-extrabold backdrop-blur-md hover:bg-white/60"
            >
              <Link to="/admin/factory">
                <ArrowRight className="me-1.5 h-4 w-4" strokeWidth={2.4} />
                العودة للمصنع
              </Link>
            </Button>
          }
        />

        {/* Stepper */}
        <div className="glass-steel rounded-3xl border border-white/40 p-3 shadow-soft">
          <ol className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <li key={s.id} className="flex flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/40 backdrop-blur-md transition",
                      active && "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elevated",
                      done && !active && "bg-emerald-500/20 text-emerald-700",
                      !active && !done && "bg-white/40 text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="h-4 w-4" strokeWidth={2.6} />
                    ) : (
                      <Icon className="h-4 w-4" strokeWidth={2.4} />
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden text-[11.5px] font-extrabold sm:inline",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span
                      className={cn(
                        "ms-1 h-px flex-1 transition",
                        done ? "bg-emerald-500/40" : "bg-white/40",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Stage panels */}
        <div className="relative min-h-[360px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.section
                key="s1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="glass-steel-strong rounded-3xl border border-white/40 p-6 shadow-elevated"
              >
                <header className="mb-4">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                    <Wand2 className="h-3 w-3" />
                    الخطوة الأولى · التعريف
                  </p>
                  <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">
                    صف الواجهة التي تحتاجها
                  </h2>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    اكتب باللغة الطبيعية. حكيم سيستنتج الخلايا الجذعية المناسبة.
                  </p>
                </header>
                <Textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={6}
                  placeholder="مثال: أريد نقطة بيع لمطعم مشويات مع شاشة مطبخ وربط بالسائقين..."
                  className="rounded-2xl border-white/40 bg-white/50 text-[13.5px] backdrop-blur-md focus-visible:ring-primary/40"
                />
              </motion.section>
            )}

            {step === 2 && (
              <motion.section
                key="s2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="glass-steel-strong rounded-3xl border border-white/40 p-6 shadow-elevated"
              >
                <header className="mb-4">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                    <Sparkles className="h-3 w-3" />
                    الخطوة الثانية · مخطط حكيم
                  </p>
                  <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">
                    {thinking ? "حكيم يفكر..." : "خلايا مقترحة لبناء واجهتك"}
                  </h2>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {thinking
                      ? "نقوم بتحليل وصفك واختيار أنسب الخلايا الجذعية..."
                      : "هذه الخلايا الجذعية ستُجمَّع داخل بيئة العمل الجديدة."}
                  </p>
                </header>

                {thinking ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary-glow/10 shadow-elevated">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" strokeWidth={2.4} />
                    </div>
                    <p className="font-display text-[14px] font-extrabold">
                      تحليل الوصف وبناء التركيبة المثلى...
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {blueprint.map((cell, i) => {
                      const Icon = cell.icon;
                      return (
                        <motion.div
                          key={cell.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: i * 0.06,
                            type: "spring",
                            stiffness: 260,
                            damping: 22,
                          }}
                          className="glass-steel relative overflow-hidden rounded-2xl border border-white/40 p-4 shadow-soft"
                        >
                          <div
                            className={cn(
                              "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                              cell.accent,
                            )}
                          />
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-elevated",
                                cell.accent,
                              )}
                            >
                              <Icon className="h-5 w-5" strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-display text-[14px] font-extrabold tracking-tight">
                                {cell.title}
                              </h3>
                              <p className="mt-0.5 text-[11.5px] text-foreground/65">
                                {cell.subtitle}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.section>
            )}

            {step === 3 && (
              <motion.section
                key="s3"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="glass-steel-strong rounded-3xl border border-white/40 p-6 shadow-elevated"
              >
                <header className="mb-4">
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                    <Boxes className="h-3 w-3" />
                    الخطوة الثالثة · الإعدادات
                  </p>
                  <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight">
                    فعّل الوحدات التي تريد دمجها
                  </h2>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    يمكنك تعديلها لاحقاً من إعدادات بيئة العمل.
                  </p>
                </header>
                <ul className="space-y-2.5">
                  {MODULES.map((m) => {
                    const Icon = m.icon;
                    const on = modules[m.id];
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md"
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-2xl transition",
                            on
                              ? "bg-gradient-to-br from-primary/25 to-primary-glow/10 text-primary"
                              : "bg-white/50 text-muted-foreground",
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.4} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-[13.5px] font-extrabold tracking-tight">
                            {m.label}
                          </p>
                          <p className="text-[11.5px] text-muted-foreground">
                            {m.description}
                          </p>
                        </div>
                        <Switch
                          checked={on}
                          onCheckedChange={(v) =>
                            setModules((s) => ({ ...s, [m.id]: !!v }))
                          }
                        />
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            )}

            {step === 4 && (
              <motion.section
                key="s4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className="glass-steel-strong relative overflow-hidden rounded-3xl border border-white/40 p-6 shadow-elevated"
              >
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-primary/30 to-primary-glow/15 blur-3xl" />
                <div className="relative">
                  <header className="mb-4">
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-white/40 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                      <Rocket className="h-3 w-3" />
                      الخطوة الأخيرة · الإطلاق
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
                      جاهز لإطلاق بيئة العمل الجديدة
                    </h2>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      سننشئ بيئة عمل تحتوي على {blueprint.length} خلية جذعية و
                      {" "}
                      {Object.values(modules).filter(Boolean).length} وحدة مفعّلة.
                    </p>
                  </header>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                        الخلايا
                      </p>
                      <p className="font-display mt-1 text-2xl font-extrabold">
                        {blueprint.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                        الوحدات
                      </p>
                      <p className="font-display mt-1 text-2xl font-extrabold">
                        {Object.values(modules).filter(Boolean).length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/40 bg-white/40 p-3 backdrop-blur-md">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-widest text-muted-foreground">
                        السياق
                      </p>
                      <p className="font-display mt-1 text-[14px] font-extrabold">
                        ريف المدينة
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center">
                    {deployed ? (
                      <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-5 py-3 text-emerald-700">
                        <CheckCircle2 className="h-5 w-5" strokeWidth={2.6} />
                        <span className="font-extrabold">
                          تم! نُحوّلك للمصنع...
                        </span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        onClick={deploy}
                        disabled={deploying}
                        className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow px-8 text-[14px] font-extrabold text-primary-foreground shadow-elevated hover:opacity-95 disabled:opacity-60"
                      >
                        {deploying ? (
                          <Loader2 className="me-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Rocket className="me-2 h-5 w-5" strokeWidth={2.4} />
                        )}
                        تهيئة بيئة العمل
                      </Button>
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        {step !== 4 && (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={step === 1 || thinking}
              className="rounded-2xl border border-white/40 bg-white/40 px-4 text-[12.5px] font-extrabold backdrop-blur-md hover:bg-white/60 disabled:opacity-40"
            >
              <ArrowRight className="me-1.5 h-4 w-4" strokeWidth={2.4} />
              السابق
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={thinking}
              className="rounded-2xl bg-gradient-to-br from-primary to-primary-glow px-5 text-[12.5px] font-extrabold text-primary-foreground shadow-elevated hover:opacity-95 disabled:opacity-60"
            >
              {step === 3 ? "متابعة للإطلاق" : "التالي"}
              <ArrowLeft className="ms-1.5 h-4 w-4" strokeWidth={2.4} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReefFactoryBuilder;
