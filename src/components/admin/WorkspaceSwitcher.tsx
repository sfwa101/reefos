/**
 * Phase 66.1 — The Sovereign Notch (Workspace Switcher).
 *
 * Sits in the top center of the admin shell. Shows the active workspace
 * label with a chevron; clicking opens a list of the user's available
 * workspaces (from `my_workspaces()` via `useCapabilities`). Selecting one
 * mutates `useSovereignContext.activeWorkspaceId`, which morphs theme +
 * capabilities + navigation globally.
 */
import { useState } from "react";
import { ChevronDown, Check, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCapabilities } from "@/hooks/useCapability";
import { Button } from "@/components/ui/button";
import {
  useSovereignContext,
  type WorkspaceKind,
} from "@/core/capabilities/store/useSovereignContext";

const KIND_LABEL: Record<WorkspaceKind, string> = {
  reef:       "ريف المدينة",
  tayseer:    "تيسير",
  noor_eldin: "نور الدين",
  family:     "العائلة",
  global:     "السيادة العامة",
};

export function WorkspaceSwitcher({ className }: { className?: string }) {
  const { workspaces, activeWorkspaceId, loading } = useCapabilities();
  const { activeWorkspaceKind, setActiveWorkspace } = useSovereignContext();
  const [open, setOpen] = useState(false);

  const active = workspaces.find((w) => w.id === activeWorkspaceId);
  const label = active?.label ?? KIND_LABEL[activeWorkspaceKind] ?? "اختر مساحة العمل";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 h-10 px-4 rounded-full",
            "bg-card/80 hover:bg-card border border-border/60 shadow-soft",
            "text-[13px] font-semibold text-foreground transition-base press",
            "backdrop-blur-xl",
            className,
          )}
          aria-label="بدّل مساحة العمل"
        >
          <Layers className="h-4 w-4 text-primary" />
          <span className="truncate max-w-[160px]">{label}</span>
          <ChevronDown className={cn("h-4 w-4 text-foreground-tertiary transition-transform", open && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64 rounded-2xl p-1.5">
        <DropdownMenuLabel className="text-[10.5px] uppercase tracking-wider text-foreground-tertiary">
          مساحات العمل
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading && (
          <div className="px-3 py-2 text-[12px] text-foreground-tertiary">…جارِ التحميل</div>
        )}
        {!loading && workspaces.length === 0 && (
          <div className="px-3 py-2 text-[12px] text-foreground-tertiary">
            لا توجد مساحات متاحة
          </div>
        )}
        {workspaces.map((w) => {
          const isActive = w.id === activeWorkspaceId;
          return (
            <DropdownMenuItem
              key={w.id}
              onSelect={() => setActiveWorkspace(w.id, w.kind as WorkspaceKind)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2 cursor-pointer text-[13px]",
                isActive && "bg-primary/10 text-primary font-semibold",
              )}
            >
              <div className="flex flex-col min-w-0">
                <span className="truncate">{w.label}</span>
                <span className="text-[10px] text-foreground-tertiary">
                  {KIND_LABEL[w.kind as WorkspaceKind] ?? w.kind}
                </span>
              </div>
              {isActive && <Check className="h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WorkspaceSwitcher;
