/**
 * Tayseer Transfer Console
 * ------------------------
 * CFO-grade form to execute live double-entry transfers via the
 * `tayseer_transfer_funds` RPC. Strictly consumes useTransferMutation.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowRightLeft, ShieldCheck } from "lucide-react";
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

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = z
  .object({
    sender_wallet_id: z
      .string()
      .trim()
      .regex(uuidRe, "Sender must be a valid wallet UUID"),
    receiver_wallet_id: z
      .string()
      .trim()
      .regex(uuidRe, "Receiver must be a valid wallet UUID"),
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
  })
  .refine((d) => d.sender_wallet_id !== d.receiver_wallet_id, {
    message: "Sender and Receiver wallets must differ",
    path: ["receiver_wallet_id"],
  });

type FormValues = z.infer<typeof schema>;

const CURRENCIES = ["SAR", "USD", "AED", "EUR", "XAU", "XAG"] as const;

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function TransferForm() {
  const mutation = useTransferMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sender_wallet_id: "",
      receiver_wallet_id: "",
      transfer_amount: 0,
      transfer_currency: "SAR",
      transfer_description: "",
    },
    mode: "onBlur",
  });

  const onSubmit = (values: FormValues) => {
    const idempotency_key = generateIdempotencyKey();
    mutation.mutate(
      {
        sender_wallet_id: values.sender_wallet_id,
        receiver_wallet_id: values.receiver_wallet_id,
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
            sender_wallet_id: "",
            receiver_wallet_id: "",
            transfer_amount: 0,
            transfer_currency: values.transfer_currency,
            transfer_description: "",
          });
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

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur shadow-sm">
      <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold">Tayseer Transfer Console</h2>
          <p className="text-[11px] text-foreground-tertiary flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Atomic · Idempotent · Double-entry
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-4">
          <FormField
            control={form.control}
            name="sender_wallet_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sender Wallet ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className="font-mono text-xs"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="receiver_wallet_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receiver Wallet ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className="font-mono text-xs"
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                      {...field}
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => form.reset()}
              disabled={isPending}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-[140px]">
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
