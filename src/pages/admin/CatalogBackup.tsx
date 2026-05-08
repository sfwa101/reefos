
/**
 * Admin · Catalog Backup & Restore.
 *
 * Browser-side counterpart of `scripts/db-backup/sync-seed.ts`. Uses the
 * SAME hardcoded allowlist (CATALOG_TABLES + PK) imported from the script
 * so there is one — and only one — source of truth for what counts as
 * "public catalog data".
 *
 * Security:
 *   - Wrapped by RoleGuard roles={['admin']} at the route level.
 *   - Reads use the standard browser supabase client, so RLS still applies.
 *     Catalog tables are world-readable, customer tables are NOT — even if
 *     someone tampered with the allowlist, RLS would block the export.
 *   - Restore writes go through the same authenticated client, gated by
 *     the existing admin RLS policies on each catalog table.
 */
import { useCallback, useRef, useState } from "react";
import { Download, Upload, ShieldCheck, Loader2, FileJson, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CATALOG_TABLES,
  PK,
  type CatalogTable,
  type SeedFile,
} from "@/lib/catalogSeedShared";
// Phase 15.1 — products/categories tables dropped; legacy admin/POS callsites use a typed-erased alias.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const __sb: any = supabase;

type Counts = Partial<Record<CatalogTable, number>>;
type LogLine = { level: "ok" | "warn" | "err"; text: string };

const fmtTs = () => new Date().toISOString().replace(/[:.]/g, "-");

const CatalogBackupPage = () => {
  const [busy, setBusy] = useState<"idle" | "backup" | "restore">("idle");
  const [counts, setCounts] = useState<Counts>({});
  const [log, setLog] = useState<LogLine[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const push = useCallback((level: LogLine["level"], text: string) => {
    setLog((l) => [...l, { level, text }]);
  }, []);

  const runBackup = useCallback(async () => {
    setBusy("backup");
    setLog([]);
    setCounts({});
    const tables = {} as Record<CatalogTable, Record<string, unknown>[]>;
    try {
      for (const t of CATALOG_TABLES) {
        const { data, error } = await __sb
          .from(t)
          .select("*")
          .order(PK[t], { ascending: true });
        if (error) throw new Error(`${t}: ${error.message}`);
        tables[t] = (data ?? []) as Record<string, unknown>[];
        setCounts((c) => ({ ...c, [t]: tables[t].length }));
        push("ok", `✔ ${t}: ${tables[t].length} صف`);
      }
      const seed: SeedFile = {
        $schema: "./catalog_seed.schema.md",
        version: 1,
        exported_at: new Date().toISOString(),
        exported_by: "admin-ui",
        note: "Disaster-recovery seed for PUBLIC catalog only. NEVER stores customer PII.",
        tables,
      };
      const blob = new Blob([JSON.stringify(seed, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalog_seed_${fmtTs()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      push("ok", "✅ تم تنزيل النسخة الاحتياطية بنجاح.");
    } catch (e) {
      push("err", `❌ فشل النسخ: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("idle");
    }
  }, [push]);

  const runRestore = useCallback(
    async (file: File) => {
      setBusy("restore");
      setLog([]);
      setCounts({});
      try {
        const text = await file.text();
        const seed = JSON.parse(text) as SeedFile;
        if (seed.version !== 1) {
          throw new Error(`نسخة غير مدعومة: ${String(seed.version)}`);
        }
        const order: CatalogTable[] = [
          "categories",
          "loyalty_tier_rules",
          "incentive_milestones",
          "products",
        ];
        for (const t of order) {
          const rows = seed.tables[t] ?? [];
          if (rows.length === 0) {
            push("warn", `· ${t}: لا صفوف (تخطٍ)`);
            continue;
          }
          // Rows came from the same Supabase schema (round-trip), so the
          // generated row types apply. The generic Record<string, unknown>
          // shape we carry through SeedFile loses that link — cast at the
          // single boundary instead of fragmenting the loop.
          const { error } = await supabase
            .from(t)
            .upsert(rows as never, { onConflict: PK[t] });
          if (error) throw new Error(`${t}: ${error.message}`);
          setCounts((c) => ({ ...c, [t]: rows.length }));
          push("ok", `✔ ${t}: تم upsert لـ ${rows.length} صف`);
        }
        push("ok", "✅ تمت الاستعادة الكاملة بنجاح.");
      } catch (e) {
        push("err", `❌ فشل الاستعادة: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy("idle");
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [push],
  );

  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-black text-foreground">
          نسخ احتياطي للكتالوج
        </h1>
        <p className="text-sm text-muted-foreground">
          تأمين كتالوج المتجر العام (المنتجات، الأقسام، قواعد الولاء، نقاط
          الحوافز) ضد كوارث قاعدة البيانات. لا يلمس بيانات العملاء أبداً.
        </p>
      </header>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-[13px] text-foreground">
        <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          الجداول المسموح بها فقط
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
          {CATALOG_TABLES.map((t) => (
            <li key={t} className="rounded-md bg-emerald-500/10 px-2 py-1 font-mono">
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-[12px] text-foreground">
        <div className="flex items-center gap-2 font-bold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          ممنوع منعاً باتاً
        </div>
        <p className="mt-1 text-muted-foreground">
          بيانات العملاء (orders, profiles, cart_items, wallet_transactions, …)
          محمية بـ RLS وتُدار حصرياً عبر النسخ الاحتياطية السحابية لـ Supabase.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          size="lg"
          onClick={runBackup}
          disabled={busy !== "idle"}
          className="h-14 gap-2"
        >
          {busy === "backup" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          نسخ احتياطي الآن
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={busy !== "idle"}
          className="h-14 gap-2"
        >
          {busy === "restore" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          استعادة من ملف…
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void runRestore(f);
          }}
        />
      </div>

      {Object.keys(counts).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <FileJson className="h-4 w-4 text-primary" /> ملخّص العملية
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm tabular-nums">
            {(Object.entries(counts) as [CatalogTable, number][]).map(([t, n]) => (
              <div key={t} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5">
                <span className="font-mono text-xs text-muted-foreground">{t}</span>
                <span className="font-extrabold text-foreground">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {log.length > 0 && (
        <div className="rounded-2xl border border-border bg-background p-4 font-mono text-[12px]">
          {log.map((l, i) => (
            <div
              key={i}
              className={
                l.level === "err"
                  ? "text-destructive"
                  : l.level === "warn"
                    ? "text-amber-600"
                    : "text-foreground"
              }
            >
              {l.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogBackupPage;
