import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Activity, Search, ShieldCheck, ChevronDown, ChevronRight, RefreshCw, AlertTriangle } from "lucide-react";
import { listEventTimelineFn } from "@/core/system/sovereign.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { workspaceQueryKey, getWorkspaceIdSync } from "@/core/identity/workspace";

/**
 * SovereignTracing — Phase 45 forensic event viewer.
 * Strictly read-only timeline over `salsabil_event_timeline`.
 * Admin-gated by RLS (`event_timeline_admin_read`) AND client guard.
 */

type EventRow = {
  id: string;
  trace_id: string;
  actor_id: string | null;
  event_domain: string;
  event_type: string;
  payload: unknown;
  created_at: string;
};

const PAGE_SIZE = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DOMAIN_OPTIONS = [
  { value: "all", label: "كل النطاقات" },
  { value: "checkout", label: "checkout" },
  { value: "wallet", label: "wallet" },
  { value: "hakim", label: "hakim" },
  { value: "auth", label: "auth" },
  { value: "admin", label: "admin" },
  { value: "sdui", label: "sdui" },
];

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "medium" });
  } catch {
    return iso;
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserialisable payload]";
  }
}

function PayloadViewer({ payload }: { payload: unknown }) {
  const [open, setOpen] = useState(false);
  const text = useMemo(() => safeStringify(payload), [payload]);
  const preview = text.length > 80 ? text.slice(0, 80) + "…" : text;

  return (
    <div className="text-[11.5px] font-mono">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-foreground-secondary hover:text-foreground transition-base"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="truncate max-w-[420px]">{open ? "إخفاء الحمولة" : preview}</span>
      </Button>
      {open && (
        <pre dir="ltr" className="mt-2 p-3 rounded-lg bg-muted/40 border border-border/40 overflow-auto max-h-80 text-[11px] leading-relaxed">
          {text}
        </pre>
      )}
    </div>
  );
}

export default function SovereignTracingPage() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const [traceId, setTraceId] = useState("");
  const [actorId, setActorId] = useState("");
  const [domain, setDomain] = useState("all");
  const [page, setPage] = useState(0);

  const traceFilter = traceId.trim();
  const actorFilter = actorId.trim();
  const validTrace = traceFilter === "" || UUID_RE.test(traceFilter);
  const validActor = actorFilter === "" || UUID_RE.test(actorFilter);

  const queryKey = workspaceQueryKey(
    "admin",
    "sovereign-tracing",
    { trace: validTrace ? traceFilter : "", actor: validActor ? actorFilter : "", domain, page },
  );

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    placeholderData: keepPreviousData,
    enabled: !rolesLoading && hasRole("admin") && getWorkspaceIdSync() !== null,
    queryFn: async (): Promise<EventRow[]> => {
      const rows = await listEventTimelineFn({
        data: {
          trace_id: validTrace ? traceFilter : "",
          actor_id: validActor ? actorFilter : "",
          domain,
          page,
        },
      });
      return (rows ?? []) as EventRow[];
    },
  });

  if (!rolesLoading && !hasRole("admin")) {
    return (
      <div className="p-8 text-center">
        <ShieldCheck className="h-10 w-10 mx-auto text-foreground-tertiary" />
        <p className="mt-3 text-sm text-foreground-secondary">هذه الصفحة محصورة على المسؤولين فقط.</p>
      </div>
    );
  }

  const rows = data ?? [];
  const canPrev = page > 0;
  const canNext = rows.length === PAGE_SIZE;

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            مراقب الأحداث السيادي
          </h1>
          <p className="text-[12.5px] text-foreground-tertiary mt-1">
            تتبع جنائي لجميع العمليات الحساسة عبر Trace ID — للقراءة فقط.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ml-1 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl glass-strong border border-border/40">
        <div className="space-y-1">
          <label className="text-[11px] text-foreground-tertiary">Trace ID</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
            <Input
              value={traceId}
              onChange={(e) => { setTraceId(e.target.value); setPage(0); }}
              placeholder="UUID..."
              className={`pr-8 font-mono text-[12px] ${!validTrace ? "border-destructive" : ""}`}
              dir="ltr"
            />
          </div>
          {!validTrace && <p className="text-[10.5px] text-destructive">صيغة UUID غير صحيحة</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-foreground-tertiary">Actor ID</label>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
            <Input
              value={actorId}
              onChange={(e) => { setActorId(e.target.value); setPage(0); }}
              placeholder="UUID..."
              className={`pr-8 font-mono text-[12px] ${!validActor ? "border-destructive" : ""}`}
              dir="ltr"
            />
          </div>
          {!validActor && <p className="text-[10.5px] text-destructive">صيغة UUID غير صحيحة</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-foreground-tertiary">Event Domain</label>
          <Select value={domain} onValueChange={(v) => { setDomain(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAIN_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError && (
        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/5 text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          فشل تحميل الأحداث: {(error as Error)?.message ?? "خطأ غير معروف"}
        </div>
      )}

      <div className="rounded-2xl border border-border/40 overflow-hidden glass">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[11px] uppercase tracking-wider text-foreground-tertiary bg-muted/30 border-b border-border/40">
          <div className="col-span-2">الوقت</div>
          <div className="col-span-2">النطاق / النوع</div>
          <div className="col-span-2">Trace</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-4">Payload</div>
        </div>
        {rows.length === 0 && !isFetching ? (
          <div className="p-10 text-center text-foreground-tertiary text-sm">لا توجد أحداث مطابقة.</div>
        ) : (
          <ul className="divide-y divide-border/30">
            {rows.map((r) => (
              <li key={r.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-[12px] items-start hover:bg-muted/20 transition-base">
                <div className="col-span-2 num text-foreground-secondary">{fmtDate(r.created_at)}</div>
                <div className="col-span-2 min-w-0">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-primary-soft text-primary text-[10.5px] font-semibold">
                    {r.event_domain}
                  </span>
                  <p className="text-[11px] text-foreground-secondary mt-1 truncate">{r.event_type}</p>
                </div>
                <div className="col-span-2 font-mono text-[10.5px] text-foreground-secondary truncate" dir="ltr" title={r.trace_id}>
                  {r.trace_id.slice(0, 13)}…
                </div>
                <div className="col-span-2 font-mono text-[10.5px] text-foreground-secondary truncate" dir="ltr" title={r.actor_id ?? "—"}>
                  {r.actor_id ? r.actor_id.slice(0, 13) + "…" : "—"}
                </div>
                <div className="col-span-4 min-w-0">
                  <PayloadViewer payload={r.payload} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11.5px] text-foreground-tertiary">
          صفحة {page + 1} • {rows.length} حدث {isFetching ? "• يحمّل..." : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!canPrev || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            السابق
          </Button>
          <Button variant="outline" size="sm" disabled={!canNext || isFetching} onClick={() => setPage((p) => p + 1)}>
            التالي
          </Button>
        </div>
      </div>
    </div>
  );
}
