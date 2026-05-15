/**
 * Phase 66.3 — Unified Human Directory.
 *
 * Replaces the fragmented Customers / Partners / Staff pages with a single
 * search-first index of every human in the federation. Relationship chips
 * are derived from `public.human_relationships`. Click a row → 360° sheet.
 */
import { useEffect, useMemo, useState } from "react";
import { Search, Users, UserPlus } from "lucide-react";
import { listHumanDirectoryFn, type HumanProfile, type HumanRelationship } from "@/core/crm/crm.functions";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HumanProfileSheet } from "@/components/admin/crm/HumanProfileSheet";
import { CreateHumanDialog } from "@/components/admin/crm/CreateHumanDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = HumanProfile;
type Rel = HumanRelationship;

const CHIP_STYLES: Record<string, string> = {
  customer: "bg-info/10 text-info",
  vendor: "bg-primary/10 text-primary",
  partner: "bg-warning/10 text-warning",
  staff: "bg-success/10 text-success",
  workspace_member: "bg-muted text-foreground-secondary",
};
const CHIP_LABELS: Record<string, string> = {
  customer: "عميل", vendor: "تاجر", partner: "شريك", staff: "موظف", workspace_member: "عضو",
};

export default function HumanDirectory() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [relMap, setRelMap] = useState<Map<string, Set<string>>>(new Map());
  const [q, setQ] = useState("");
  const [filterKind, setFilterKind] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const refresh = async () => {
    try {
      const { profiles: profs, relationships: rels } = await listHumanDirectoryFn();
      setProfiles(profs);
      const map = new Map<string, Set<string>>();
      rels.forEach((r: Rel) => {
        if (!r.profile_id) return;
        if (!map.has(r.profile_id)) map.set(r.profile_id, new Set());
        map.get(r.profile_id)!.add(r.kind);
      });
      setRelMap(map);
    } catch (e) {
      toast.error((e as Error).message);
      setProfiles([]);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);


  const filtered = useMemo(() => {
    if (!profiles) return null;
    const t = q.trim().toLowerCase();
    return profiles.filter((p) => {
      if (filterKind && !relMap.get(p.id)?.has(filterKind)) return false;
      if (!t) return true;
      return (p.full_name ?? "").toLowerCase().includes(t) || (p.phone ?? "").includes(t);
    });
  }, [profiles, q, filterKind, relMap]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: profiles?.length ?? 0 };
    relMap.forEach((kinds) => kinds.forEach((k) => (c[k] = (c[k] ?? 0) + 1)));
    return c;
  }, [profiles, relMap]);

  return (
    <>
      <MobileTopbar title="الشبكة البشرية" />
      <div className="px-4 lg:px-6 pt-2 pb-6 max-w-5xl mx-auto" dir="rtl">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
            <Input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو الجوال — لا فرق بين عميل، تاجر، شريك، موظف"
              className="w-full bg-surface-muted rounded-2xl h-11 pr-10 pl-4 text-[14px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-2xl bg-primary text-primary-foreground text-[12.5px] font-semibold press"
          >
            <UserPlus className="h-4 w-4" /> إضافة إنسان
          </Button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <FilterChip label={`الكل (${counts.all ?? 0})`} active={filterKind === null} onClick={() => setFilterKind(null)} />
          {(["customer", "vendor", "partner", "staff", "workspace_member"] as const).map((k) => (
            <FilterChip
              key={k}
              label={`${CHIP_LABELS[k]} (${counts[k] ?? 0})`}
              active={filterKind === k}
              onClick={() => setFilterKind(filterKind === k ? null : k)}
              styles={CHIP_STYLES[k]}
            />
          ))}
        </div>

        {filtered === null ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-surface-muted animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface rounded-3xl p-10 text-center border border-border/40">
            <Users className="h-10 w-10 mx-auto text-foreground-tertiary mb-3" />
            <p className="font-display text-[16px]">لا يوجد بشر يطابقون البحث</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => {
              const kinds = Array.from(relMap.get(p.id) ?? []);
              return (
                <li key={p.id}>
                  <Button
                    onClick={() => setOpenId(p.id)}
                    className="w-full flex items-center gap-3 bg-surface rounded-2xl p-3 border border-border/40 text-right press hover:border-primary/30 transition-base"
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-display">
                        {(p.full_name ?? "؟").slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[14px] truncate">{p.full_name ?? "بدون اسم"}</p>
                      <p className="text-[11.5px] text-foreground-tertiary truncate">
                        {p.phone ?? "—"} {p.governorate ? `• ${p.governorate}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[40%]">
                      {kinds.length === 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-foreground-tertiary">خامل</span>
                      )}
                      {kinds.map((k) => (
                        <span key={k} className={cn("text-[10px] px-2 py-0.5 rounded-md", CHIP_STYLES[k] ?? CHIP_STYLES.workspace_member)}>
                          {CHIP_LABELS[k] ?? k}
                        </span>
                      ))}
                    </div>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <HumanProfileSheet profileId={openId} open={!!openId} onOpenChange={(o) => !o && setOpenId(null)} />
      <CreateHumanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          void refresh();
          setOpenId(id);
        }}
      />
    </>
  );
}

function FilterChip({ label, active, onClick, styles }: { label: string; active: boolean; onClick: () => void; styles?: string }) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "text-[11.5px] px-3 py-1.5 rounded-xl border transition-base press",
        active ? "bg-primary text-primary-foreground border-primary" : `${styles ?? "bg-surface-muted text-foreground-secondary"} border-border/40`,
      )}
    >
      {label}
    </Button>
  );
}
