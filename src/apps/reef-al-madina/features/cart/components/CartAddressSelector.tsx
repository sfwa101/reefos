import { useState } from "react";
import { Check, MapPin, Plus } from "lucide-react";
import type { AuthUser as User } from "@/core/identity";
import type { Addr } from "../types/cart.types";
import AddressSheet from "@/apps/reef-al-madina/features/logistics/components/AddressSheet";

type Props = {
  user: User | null;
  addresses: Addr[];
  addrId: string;
  setAddrId: (id: string) => void;
  guestNotes: string;
  setGuestNotes: (v: string) => void;
};

/**
 * Address selector — opens a Map-first BottomSheet for new addresses
 * instead of navigating to /account/addresses (preserves cart state).
 */
export const CartAddressSelector = ({
  user,
  addresses,
  addrId,
  setAddrId,
  guestNotes,
  setGuestNotes,
}: Props) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <section className="rounded-2xl bg-card p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.1)] ring-1 ring-border/30">
      <div className="mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold">عنوان التوصيل</p>
      </div>

      {user ? (
        addresses.length > 0 ? (
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex gap-2 pb-1">
              {addresses.map((a) => {
                const active = a.id === addrId;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAddrId(a.id)}
                    className={`flex w-[200px] shrink-0 flex-col items-start gap-1 rounded-2xl border-2 p-3 text-right transition ${
                      active ? "border-primary bg-primary-soft" : "border-border bg-background"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <p className="text-sm font-extrabold">{a.label}</p>
                      {active && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">
                      {[a.street, a.building, a.district, a.city].filter(Boolean).join("، ")}
                    </p>
                    {a.is_default && (
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                        افتراضي
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex w-[120px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 p-3 text-[11px] font-bold text-primary"
              >
                <Plus className="h-5 w-5" /> عنوان جديد
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary/10 py-3 text-xs font-bold text-primary"
          >
            <Plus className="h-4 w-4" /> أضف عنوانًا للتوصيل
          </button>
        )
      ) : (
        <textarea
          value={guestNotes}
          onChange={(e) => setGuestNotes(e.target.value)}
          placeholder="اكتب عنوان التوصيل…"
          rows={2}
          className="w-full rounded-xl bg-foreground/5 px-3 py-3 text-sm outline-none"
        />
      )}

      <AddressSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={(id) => setAddrId(id)}
      />
    </section>
  );
};
