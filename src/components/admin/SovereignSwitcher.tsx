/**
 * SovereignSwitcher — Glass dropdown that morphs the entire AdminShell
 * between Salsabil OS (Motherboard) and any child civilization.
 *
 * • Trigger sits in the AdminHeader next to the menu/brand.
 * • Popover lists OS_COMPANIES with status badges (Live/Building/Design).
 * • Selecting a "live" company also mutates `useSovereignContext` so the
 *   theme + capability scope follow.
 * • Design companies are visually muted but still selectable for preview.
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Layers, Sparkles } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  OS_COMPANIES,
  STATUS_META,
  type OSCompany,
} from "@/core/identity/osCompanies";
import { useActiveOSCompany } from "@/core/identity/useActiveOSCompany";
import {
  useSovereignContext,
  type WorkspaceKind,
} from "@/core/capabilities/store/useSovereignContext";

function CompanyAvatar({
  company,
  size = "md",
}: {
  company: OSCompany;
  size?: "sm" | "md";
}) {
  const Icon = company.icon;
  const dim = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  const iconDim = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div
      className={cn(
        "shrink-0 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-elevated",
        dim,
        company.accent,
      )}
    >
      <Icon className={iconDim} strokeWidth={2.4} />
    </div>
  );
}

export function SovereignSwitcher() {
  const [open, setOpen] = useState(false);
  const { activeId, setActive } = useActiveOSCompany();
  const { setActiveWorkspace } = useSovereignContext();

  const active = useMemo(
    () => OS_COMPANIES.find((c) => c.id === activeId) ?? OS_COMPANIES[0],
    [activeId],
  );

  const groups = useMemo(() => {
    const motherboard = OS_COMPANIES.filter((c) => c.id === "global");
    const others = OS_COMPANIES.filter((c) => c.id !== "global");
    return { motherboard, others };
  }, []);

  const handleSelect = (c: OSCompany) => {
    setActive(c.id);
    if (c.workspaceKind) {
      // Morph the live workspace context too so theme + caps follow.
      setActiveWorkspace(null, c.workspaceKind as WorkspaceKind);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="بدّل بين شركات Salsabil OS"
          className={cn(
            "group inline-flex h-10 items-center gap-2 rounded-2xl",
            "border border-white/40 bg-white/40 backdrop-blur-md",
            "px-2.5 pe-3 transition hover:bg-white/60 active:scale-[0.97]",
            "shadow-soft",
          )}
        >
          <CompanyAvatar company={active} size="sm" />
          <div className="hidden text-right leading-tight md:block">
            <p className="text-[12px] font-extrabold tracking-tight">
              {active.name}
            </p>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
              {STATUS_META[active.status].label}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={10}
        className={cn(
          "w-[320px] rounded-3xl border border-white/40 bg-white/80 p-0",
          "shadow-elevated backdrop-blur-2xl dark:bg-slate-900/80",
        )}
      >
        <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3">
          <Layers className="h-4 w-4 text-primary" />
          <p className="text-[12px] font-extrabold uppercase tracking-wider">
            Salsabil Civilization
          </p>
          <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            <Sparkles className="h-3 w-3" /> {OS_COMPANIES.length}
          </span>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          <CompanyGroup
            label="اللوحة الأم"
            items={groups.motherboard}
            activeId={activeId}
            onSelect={handleSelect}
          />
          <CompanyGroup
            label="الشركات والوحدات"
            items={groups.others}
            activeId={activeId}
            onSelect={handleSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CompanyGroup({
  label,
  items,
  activeId,
  onSelect,
}: {
  label: string;
  items: ReadonlyArray<OSCompany>;
  activeId: string;
  onSelect: (c: OSCompany) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((c) => {
          const isActive = c.id === activeId;
          const status = STATUS_META[c.status];
          const muted = c.status === "design";
          return (
            <li key={c.id}>
              <motion.button
                type="button"
                onClick={() => onSelect(c)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-right transition",
                  isActive
                    ? "bg-primary/10 ring-1 ring-primary/40"
                    : "hover:bg-white/60 dark:hover:bg-white/5",
                  muted && !isActive && "opacity-80",
                )}
              >
                <CompanyAvatar company={c} />
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[13px] font-extrabold leading-tight truncate">
                    {c.name}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground truncate">
                    {c.tagline}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-extrabold",
                    status.chip,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                  {status.label}
                </span>
                {isActive && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </motion.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SovereignSwitcher;
