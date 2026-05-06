/**
 * WalletCombobox — async, debounced wallet picker.
 * Searches by UUID (id or user_id) or by profile name/phone.
 */
import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, Wallet as WalletIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { fmtNum } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useWalletSearch,
  type WalletSearchResult,
} from "@/hooks/useWalletSearch";

export interface WalletComboboxProps {
  value: WalletSearchResult | null;
  onChange: (wallet: WalletSearchResult | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** id of the wallet to exclude (e.g. don't pick sender as receiver) */
  excludeId?: string;
  invalid?: boolean;
}

function statusTone(status: string) {
  if (status === "active") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (status === "frozen") return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  return "bg-rose-500/15 text-rose-600 border-rose-500/30";
}

export function WalletCombobox({
  value,
  onChange,
  placeholder = "Search by name, phone, or UUID…",
  disabled,
  excludeId,
  invalid,
}: WalletComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 300);
  const { data, isFetching } = useWalletSearch(debounced);

  const results = (data ?? []).filter((w) => w.id !== excludeId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-auto py-2.5 px-3 font-normal",
            invalid && "border-destructive ring-1 ring-destructive/30",
          )}
        >
          {value ? (
            <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
              <WalletIcon className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {value.profile?.full_name ?? value.profile?.phone ?? "Unnamed user"}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">
                  {value.id}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold num">
                  {fmtNum(value.balance)} <span className="text-[10px] text-muted-foreground">{value.currency}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("h-4 text-[9px] px-1.5", statusTone(value.status))}
                >
                  {value.status}
                </Badge>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              placeholder={placeholder}
              value={term}
              onValueChange={setTerm}
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <CommandList>
            {!isFetching && debounced.length < 2 && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Type at least 2 characters…
              </div>
            )}
            {!isFetching && debounced.length >= 2 && results.length === 0 && (
              <CommandEmpty>No wallets match.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading={`${results.length} result(s)`}>
                {results.map((w) => {
                  const selected = value?.id === w.id;
                  return (
                    <CommandItem
                      key={w.id}
                      value={w.id}
                      onSelect={() => {
                        onChange(w);
                        setOpen(false);
                      }}
                      className="flex items-start gap-2"
                    >
                      <Check
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {w.profile?.full_name ?? w.profile?.phone ?? "Unnamed user"}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn("h-4 text-[9px] px-1.5", statusTone(w.status))}
                          >
                            {w.status}
                          </Badge>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate">
                          {w.id}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-sm font-semibold num">{fmtNum(w.balance)}</div>
                        <div className="text-[10px] text-muted-foreground">{w.currency}</div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default WalletCombobox;
