/**
 * SearchOverlay — fullscreen cinematic search modal.
 * Combines: input bar, barcode camera, recent history, trending suggestions,
 * federated results, and the missing-product request form.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search as SearchIcon, X, ScanLine, History, TrendingUp, Trash2, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { useUniversalSearch } from "../hooks/useUniversalSearch";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { BarcodeScannerSheet } from "./BarcodeScannerSheet";
import { RequestProductForm } from "./RequestProductForm";
import type { SearchHit } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TRENDING = ["دجاج", "حليب", "أرز", "زيت", "خضار", "قهوة"] as const;

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
}

export const SearchOverlay = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const { hits, total, searchByBarcode, entityCount } = useUniversalSearch(query);
  const { history, push, remove, clear } = useSearchHistory();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setShowRequest(false);
      setScannedBarcode("");
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleSelect = (hit: SearchHit) => {
    push(query);
    onClose();
    navigate({ to: hit.href });
  };

  const handleBarcode = (code: string) => {
    const found = searchByBarcode(code);
    if (found) {
      toast.success(`تم العثور على: ${found.title}`);
      onClose();
      navigate({ to: found.href });
      return;
    }
    toast.info("منتج غير معروف — يمكنك تقديم طلب لإضافته");
    setScannedBarcode(code);
    setQuery(code);
    setShowRequest(true);
  };

  const grouped = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const h of hits) {
      const key = h.kind === "restaurant" ? "مطاعم" : (h.category ?? "منتجات");
      const arr = map.get(key) ?? [];
      arr.push(h);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [hits]);

  if (!open) return null;

  const showEmptyState = query.trim().length >= 2 && total === 0;

  return (
    <div className="fixed inset-0 z-[85] flex flex-col bg-background" role="dialog" aria-modal="true" dir="rtl">
      {/* Search bar */}
      <div className="glass-strong flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <Button
          onClick={onClose}
          aria-label="إغلاق"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-border/60 focus-within:ring-primary">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج، علامة، مطعم…"
            className="flex-1 bg-transparent text-sm outline-none"
            inputMode="search"
          />
          {query && (
            <Button onClick={() => setQuery("")} aria-label="مسح" className="text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Button
          onClick={() => setScannerOpen(true)}
          aria-label="مسح باركود"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pill"
        >
          <ScanLine className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 pb-12">
        {/* Idle state — history + trending */}
        {!query && (
          <div className="space-y-5 pt-4">
            {history.length > 0 && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-foreground/70">
                    <History className="h-3.5 w-3.5" /> آخر عمليات البحث
                  </p>
                  <Button
                    onClick={clear}
                    className="flex items-center gap-1 text-[10.5px] font-extrabold text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> مسح الكل
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((h) => (
                    <span key={h} className="inline-flex items-center gap-1 rounded-full bg-foreground/5 ps-3 pe-1 py-1.5">
                      <Button onClick={() => setQuery(h)} className="text-xs font-bold">{h}</Button>
                      <Button
                        onClick={() => remove(h)}
                        aria-label={`إزالة ${h}`}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-foreground/70">
                <TrendingUp className="h-3.5 w-3.5" /> الأكثر بحثاً الآن
              </p>
              <div className="flex flex-wrap gap-2">
                {TRENDING.map((t) => (
                  <Button
                    key={t}
                    onClick={() => setQuery(t)}
                    className="rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </section>

            <p className="text-center text-[10px] text-muted-foreground">
              يبحث محرك OMNI في {entityCount.toLocaleString("ar-EG")} عنصر فوراً
            </p>
          </div>
        )}

        {/* Results */}
        {query && grouped.length > 0 && (
          <div className="space-y-5 pt-3">
            {grouped.map(([cat, items]) => (
              <section key={cat}>
                <h3 className="mb-2 px-1 font-display text-sm font-extrabold">{cat}</h3>
                <div className="space-y-1.5">
                  {items.map((h) => (
                    <Button
                      key={h.id}
                      onClick={() => handleSelect(h)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-card p-2.5 text-right ring-1 ring-border/60 active:scale-[0.99]"
                    >
                      {h.image ? (
                        <img src={h.image} alt="" loading="lazy" className="h-12 w-12 rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft">
                          <PackageSearch className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold">{h.title}</p>
                        {h.subtitle && (
                          <p className="truncate text-[11px] text-muted-foreground">{h.subtitle}</p>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Empty state — show request form */}
        {showEmptyState && (
          <div className="space-y-4 pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
                <PackageSearch className="h-9 w-9 text-primary" />
              </div>
              <h2 className="mt-3 font-display text-lg font-extrabold">لم نجد ما تبحث عنه</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                ساعدنا بتوفير المنتج عبر إرسال طلب سريع
              </p>
            </div>
            {!showRequest ? (
              <Button
                onClick={() => setShowRequest(true)}
                className="h-12 w-full rounded-2xl bg-foreground text-[13px] font-extrabold text-background shadow-pill"
              >
                طلب إضافة منتج
              </Button>
            ) : (
              <RequestProductForm
                initialQuery={query}
                initialBarcode={scannedBarcode}
                onSubmitted={() => push(query)}
              />
            )}
          </div>
        )}
      </div>

      <BarcodeScannerSheet
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcode}
      />
    </div>
  );
};
