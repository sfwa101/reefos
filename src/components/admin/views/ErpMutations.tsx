/**
 * ErpMutations — Sovereign Mutation Arsenal showcase.
 *
 * Pure presentation surface that wires the four flagship Glass form modals
 * (Product / Supplier / Employee Role / Expense) into a single Steel Glass
 * dashboard so admins can initiate any core ERP creation in one tap.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  PackagePlus,
  Receipt,
  Truck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { SectionHeader } from "@/components/admin/ui/SectionHeader";
import {
  ExpenseFormModal,
  ProductFormModal,
  StaffRoleFormModal,
  SupplierFormModal,
} from "@/components/admin/forms";

type ArsenalCell = {
  key: "product" | "supplier" | "employee" | "expense";
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  badge: string;
};

const CELLS: ArsenalCell[] = [
  {
    key: "product",
    title: "إضافة منتج",
    description: "محرك الكتالوج: هوية، تسعير، مخزون — ثلاث علامات تبويب.",
    icon: PackagePlus,
    accent: "from-violet-500/30 to-indigo-500/10",
    badge: "كتالوج",
  },
  {
    key: "supplier",
    title: "إضافة مورّد",
    description: "تسجيل الموردين بشروط الدفع وأيام التحصيل.",
    icon: Truck,
    accent: "from-amber-500/30 to-rose-500/10",
    badge: "شركاء",
  },
  {
    key: "employee",
    title: "إسناد دور موظف",
    description: "ربط مستخدم تيسير بدور تشغيلي داخل المنشأة.",
    icon: UserPlus,
    accent: "from-emerald-500/30 to-teal-500/10",
    badge: "موارد بشرية",
  },
  {
    key: "expense",
    title: "تسجيل مصروف",
    description: "قيد فوري في دفتر الأستاذ بنظام القيد المزدوج.",
    icon: Receipt,
    accent: "from-sky-500/30 to-blue-500/10",
    badge: "مالية",
  },
];

export default function ErpMutations() {
  const [open, setOpen] = useState<ArsenalCell["key"] | null>(null);

  return (
    <div className="bg-mesh min-h-screen px-4 py-6 md:px-8" dir="rtl">
      <SectionHeader
        eyebrow="ترسانة المُدخلات"
        title="مركز الإنشاء السيادي"
        subtitle="من هنا يبدأ كل قيد جديد في حضارة Reef Al Madina الرقمية."
        icon={Boxes}
      />

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {CELLS.map((cell, idx) => {
          const Icon = cell.icon;
          return (
            <motion.button
              key={cell.key}
              type="button"
              onClick={() => setOpen(cell.key)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, type: "spring", stiffness: 220, damping: 22 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="glass-steel-strong relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/40 p-5 text-start shadow-elevated"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-bl ${cell.accent}`}
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-foreground shadow-sm backdrop-blur-md">
                  <Icon className="h-5 w-5" strokeWidth={2.4} />
                </span>
                <span className="rounded-full bg-white/60 px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-widest text-foreground/70 backdrop-blur-md">
                  {cell.badge}
                </span>
              </div>

              <div className="relative mt-5">
                <h3 className="font-display text-lg font-extrabold tracking-tight">
                  {cell.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/70">
                  {cell.description}
                </p>
              </div>

              <div className="relative mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-violet-700">
                فتح النموذج
                <span aria-hidden>←</span>
              </div>
            </motion.button>
          );
        })}
      </section>

      <ProductFormModal open={open === "product"} onOpenChange={(v) => !v && setOpen(null)} />
      <SupplierFormModal open={open === "supplier"} onOpenChange={(v) => !v && setOpen(null)} />
      <StaffRoleFormModal open={open === "employee"} onOpenChange={(v) => !v && setOpen(null)} />
      <ExpenseFormModal open={open === "expense"} onOpenChange={(v) => !v && setOpen(null)} />
    </div>
  );
}
