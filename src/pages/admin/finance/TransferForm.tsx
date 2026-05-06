/**
 * Tayseer Transfer Console — Hyper-Scale edition.
 * ------------------------------------------------
 * Async debounced wallet pickers with profile + balance preview.
 * Mutation logic & error mapping unchanged from v1.
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { useTransferMutation } from "@/hooks/useTayseer";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WalletCombobox } from "@/components/finance/WalletCombobox";
import type { WalletSearchResult } from "@/hooks/useWalletSearch";

const schema = z
  .object({
    transfer_amount: z
      .number({ message: "Amount is required" })
      .positive("Amount must be greater than zero")
      .max(1_000_000_000, "Amount exceeds safe limit"),
    transfer_currency: z
      .string()
      .trim()
      .min(3, "Currency code required")
      .max(6)
      .transform((v) => v.toUpperCase()),
    transfer_description: z
      .string()
      .trim()
      .max(280, "Keep description under 280 chars")
      .optional()
      .or(z.literal("")),
  });

type FormValues = z.infer<typeof schema>;

const CURRENCIES = ["SAR", "USD", "AED", "EUR", "XAU", "XAG"] as const;

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function TransferForm() {
  const mutation = useTransferMutation();
  const [sender, setSender] = useState<WalletSearchResult | null>(null);
  const [receiver, setReceiver] = useState<WalletSearchResult | null>(null);
  const [touched, setTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      transfer_amount: 0,
      transfer_currency: "SAR",
      transfer_description: "",
    },
    mode: "onBlur",
  });

  // ---- Wallet-level guards
  const senderInactive = !!sender && sender.status !== "active";
  const receiverInactive = !!receiver && receiver.status !== "active";
  const sameWallet = !!sender && !!receiver && sender.id === receiver.id;
  const currencyMismatch =
    !!sender && !!receiver && sender.currency !== receiver.currency;
  const missingWallet = !sender || !receiver;

  const blockingReason =
    missingWallet
      ? "Select both a sender and a receiver wallet."
      : sameWallet
        ? "Sender and receiver must differ."
        : senderInactive
          ? `Sender wallet is ${sender!.status}.`
          : receiverInactive
            ? `Receiver wallet is ${receiver!.status}.`
            : currencyMismatch
              ? `Currency mismatch (${sender!.currency} → ${receiver!.currency}).`
              : null;

  const onSubmit = (values: FormValues) => {
    setTouched(true);
    if (blockingReason || !sender || !receiver) {
      toast.error("Cannot execute", { description: blockingReason ?? "Validation failed" });
      return;
    }

    const idempotency_key = generateIdempotencyKey();
    mutation.mutate(
      {
        sender_wallet_id: sender.id,
        receiver_wallet_id: receiver.id,
        transfer_amount: values.transfer_amount,
        transfer_currency: values.transfer_currency,
        idempotency_key,
        transfer_description: values.transfer_description?.trim() || null,
      },
      {
        onSuccess: (groupId) => {
          toast.success("Transfer executed", {
            description: `Group: ${String(groupId).slice(0, 8)}…`,
          });
          form.reset({
            transfer_amount: 0,
            transfer_currency: values.transfer_currency,
            transfer_description: "",
          });
          setSender(null);
          setReceiver(null);
          setTouched(false);
        },
        onError: (err: unknown) => {
          const raw =
            (err as { message?: string })?.message ?? "Transfer failed";
          const lower = raw.toLowerCase();
          let friendly = raw;
          if (lower.includes("insufficient")) friendly = "Insufficient funds in sender wallet.";
          else if (lower.includes("not found")) friendly = "Wallet not found.";
          else if (lower.includes("frozen") || lower.includes("closed"))
            friendly = "Wallet is not active (frozen or closed).";
          else if (lower.includes("currency")) friendly = "Currency mismatch between wallets.";
          else if (lower.includes("idempotency")) friendly = "Duplicate transfer detected (idempotency).";
          toast.error("Transfer rejected", { description: friendly });
        },
      },
    );
  };

  const isPending = mutation.isPending;
  const submitDisabled = isPending || !!blockingReason;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur shadow-sm">
      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold">Tayseer Transfer Console</h2>
          <p className="text-[11px] text-foreground-tertiary flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Atomic · Idempotent · Double-entry · Async lookup
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Sender */}
          <FormItem>
            <FormLabel>Sender Wallet</FormLabel>
            <WalletCombobox
              value={sender}
              onChange={setSender}
              placeholder="Search sender by name, phone, or UUID…"
              excludeId={receiver?.id}
              invalid={touched && (!sender || senderInactive)}
            />
            {touched && !sender && (
              <p className="text-[11px] text-destructive">Sender wallet is required.</p>
            )}
            {senderInactive && (
              <p className="text-[11px] text-destructive">
                Wallet status is {sender!.status} — transfers blocked.
              </p>
            )}
          </FormItem>

          {/* Receiver */}
          <FormItem>
            <FormLabel>Receiver Wallet</FormLabel>
            <WalletCombobox
              value={receiver}
              onChange={setReceiver}
              placeholder="Search receiver by name, phone, or UUID…"
              excludeId={sender?.id}
              invalid={touched && (!receiver || receiverInactive || sameWallet)}
            />
            {touched && !receiver && (
              <p className="text-[11px] text-destructive">Receiver wallet is required.</p>
            )}
            {receiverInactive && (
              <p className="text-[11px] text-destructive">
                Wallet status is {receiver!.status} — transfers blocked.
              </p>
            )}
            {sameWallet && (
              <p className="text-[11px] text-destructive">Sender and receiver must differ.</p>
            )}
          </FormItem>

          {currencyMismatch && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p className="text-[11.5px]">
                Currency mismatch: sender holds <b>{sender!.currency}</b>, receiver holds{" "}
                <b>{receiver!.currency}</b>. RPC will reject this transfer.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="transfer_amount"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={Number.isFinite(field.value) ? field.value : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transfer_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="transfer_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Description <span className="text-foreground-tertiary font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Internal note for audit trail…"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-[11px]">
                  An idempotency key is generated automatically at submit time.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {blockingReason && touched && (
            <p className="text-[11.5px] text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {blockingReason}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.reset();
                setSender(null);
                setReceiver(null);
                setTouched(false);
              }}
              disabled={isPending}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={submitDisabled}
              className="min-w-[140px]"
              onClick={() => setTouched(true)}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing…
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Execute Transfer
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
