/**
 * HakimCommandBar — ⌘K Command Palette (Steel Glass)
 *
 * Glass-strong overlay with quick navigation across admin surfaces and
 * a one-click "اسأل حكيم" action that switches the layer to chat panel.
 */
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Box,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  Settings,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import { useHakimLayer } from "./useHakimLayer";

type Action = {
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  onSelect?: () => void;
};

export function HakimCommandBar() {
  const mode = useHakimLayer((s) => s.mode);
  const close = useHakimLayer((s) => s.close);
  const open = useHakimLayer((s) => s.open);
  const navigate = useNavigate();

  const go = (to: string) => () => {
    close();
    navigate({ to });
  };

  const navActions: Action[] = [
    { label: "اللوحة", icon: LayoutDashboard, to: "/admin", onSelect: go("/admin") },
    { label: "الطلبات", icon: ShoppingBag, to: "/admin/orders", onSelect: go("/admin/orders") },
    { label: "العملاء", icon: Users, to: "/admin/customers", onSelect: go("/admin/customers") },
    { label: "المخزون", icon: Package, to: "/admin/inventory", onSelect: go("/admin/inventory") },
    { label: "التسويق", icon: Megaphone, to: "/admin/marketing", onSelect: go("/admin/marketing") },
    { label: "المالية", icon: Wallet, to: "/admin/finance", onSelect: go("/admin/finance") },
    { label: "التحليلات", icon: BarChart3, to: "/admin/analytics", onSelect: go("/admin/analytics") },
    { label: "المخزون السريع", icon: Box, to: "/admin/inventory", onSelect: go("/admin/inventory") },
    { label: "الإعدادات", icon: Settings, to: "/admin/settings", onSelect: go("/admin/settings") },
  ];

  const hakimActions: Action[] = [
    {
      label: "افتح محادثة حكيم",
      hint: "اسأل المستشار السيادي",
      icon: MessageCircle,
      onSelect: () => open("panel"),
    },
    {
      label: "رؤى حكيم",
      hint: "ملخصات يومية",
      icon: Sparkles,
      onSelect: go("/admin/hakim-insights"),
    },
  ];

  return (
    <CommandDialog open={mode === "command"} onOpenChange={(v) => (v ? open("command") : close())}>
      <CommandInput placeholder="بحث، تنقّل، أو اسأل حكيم…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>لا نتائج. جرّب كلمة أخرى.</CommandEmpty>

        <CommandGroup heading="حكيم">
          {hakimActions.map((a) => (
            <CommandItem
              key={a.label}
              onSelect={() => a.onSelect?.()}
              className="gap-3 rounded-xl"
            >
              <a.icon className="h-4 w-4 text-primary" />
              <span className="flex-1 font-bold">{a.label}</span>
              {a.hint && <span className="text-[11px] text-muted-foreground">{a.hint}</span>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="التنقل السريع">
          {navActions.map((a) => (
            <CommandItem
              key={a.label}
              onSelect={() => a.onSelect?.()}
              className="gap-3 rounded-xl"
            >
              <a.icon className="h-4 w-4 text-foreground/70" />
              <span className="flex-1 font-bold">{a.label}</span>
              {a.to && (
                <span className="text-[10.5px] text-muted-foreground">{a.to}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
