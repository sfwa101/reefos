import { useEffect, useRef } from "react";
import { IOSCard } from "@/components/ios/IOSCard";
import { fmtMoney } from "@/lib/format";
import { Search, Plus, Minus, Trash2, ScanLine, Package2 } from "lucide-react";
import type { PosCartLine, PosProduct } from "../types/pos.types";

type Props = {
  query: string;
  setQuery: (q: string) => void;
  filtered: PosProduct[];
  cart: PosCartLine[];
  onAdd: (p: PosProduct) => void;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
};

export function PosBarcodeCart({ query, setQuery, filtered, cart, onAdd, onInc, onDec, onRemove, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم أو امسح الباركود..."
          disabled={disabled}
          className="w-full bg-surface-muted rounded-2xl h-12 pr-10 pl-4 text-[15px] border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
      </div>

      {query && (
        <div className="space-y-1.5 max-h-64 overflow-auto">
          {filtered.length === 0 ? (
            <IOSCard className="text-center text-foreground-tertiary text-[12px] py-4">لا نتائج.</IOSCard>
          ) : filtered.map(p => (
            <button
              key={p.id}
              onClick={() => { onAdd(p); setQuery(""); inputRef.current?.focus(); }}
              disabled={disabled || p.stock === 0}
              className="w-full bg-surface rounded-xl p-2 flex items-center gap-2 press border border-border/40 disabled:opacity-50"
            >
              <div className="h-10 w-10 rounded-lg bg-surface-muted overflow-hidden shrink-0">
                {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 text-right min-w-0">
                <p className="text-[13px] font-semibold truncate">{p.name}</p>
                <p className="text-[10px] text-foreground-tertiary">مخزون: {p.stock}</p>
              </div>
              <span className="text-[13px] font-semibold text-primary num">{fmtMoney(p.price)}</span>
            </button>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="font-display text-[15px]">السلة</h3>
          <span className="text-[11px] text-foreground-tertiary">{cart.length} صنف</span>
        </div>
        {cart.length === 0 ? (
          <IOSCard className="text-center py-8">
            <Package2 className="h-8 w-8 mx-auto text-foreground-tertiary mb-2" />
            <p className="text-[12px] text-foreground-tertiary">امسح باركود أو ابحث لإضافة منتج.</p>
          </IOSCard>
        ) : (
          <div className="space-y-1.5">
            {cart.map(l => (
              <IOSCard key={l.product_id} className="!p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-lg bg-surface-muted overflow-hidden shrink-0">
                    {l.image_url && <img src={l.image_url} alt={l.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{l.name}</p>
                    <p className="text-[11px] text-foreground-tertiary num">{fmtMoney(l.price)} × {l.qty} = <span className="text-primary font-semibold">{fmtMoney(l.price * l.qty)}</span></p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onDec(l.product_id)} className="h-8 w-8 rounded-lg bg-surface-muted flex items-center justify-center press" aria-label="إنقاص"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="min-w-[2ch] text-center font-semibold text-[13px] num">{l.qty}</span>
                    <button onClick={() => onInc(l.product_id)} className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center press" aria-label="زيادة"><Plus className="h-3.5 w-3.5" /></button>
                    <button onClick={() => onRemove(l.product_id)} className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center press" aria-label="حذف"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </IOSCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
