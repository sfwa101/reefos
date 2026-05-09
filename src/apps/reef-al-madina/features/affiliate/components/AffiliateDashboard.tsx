import { useState } from "react";
import { Copy, Check, Sparkles, TrendingUp, Wallet, Users, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAffiliateEngine } from "../hooks/useAffiliateEngine";

function formatMoney(n: number, currency: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

function StatusPill({ status }: { status: string }) {
  const variant: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    vesting: "bg-sky-500/10 text-sky-600 border-sky-500/30",
    clawed_back: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${variant[status] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {status}
    </span>
  );
}

export default function AffiliateDashboard() {
  const engine = useAffiliateEngine();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!engine.referralLink) return;
    try {
      await navigator.clipboard.writeText(engine.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  if (engine.loading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (engine.error) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Couldn't load affiliate data. Please retry.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 p-4">
      {/* Referral link */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Your referral link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {engine.referralCode ? (
            <>
              <div className="flex items-stretch gap-2">
                <div className="flex flex-1 items-center rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs sm:text-sm break-all">
                  {engine.referralLink}
                </div>
                <Button
                  size="sm"
                  variant={copied ? "secondary" : "default"}
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Code:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {engine.referralCode}
                </span>
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                You don't have a referral code yet.
              </p>
              <Button
                size="sm"
                disabled={engine.provisioning}
                onClick={() => engine.provisionCode().catch(() => {})}
              >
                {engine.provisioning ? "Generating…" : "Generate code"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Wallet className="h-3 w-3" /> Available
            </div>
            <div className="mt-1 text-lg font-semibold">
              {formatMoney(engine.wallet.available, engine.wallet.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Pending
            </div>
            <div className="mt-1 text-lg font-semibold">
              {formatMoney(engine.wallet.pending, engine.wallet.currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" /> Invites
            </div>
            <div className="mt-1 text-lg font-semibold">
              {engine.state?.successful_invites ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              {engine.currentTier?.badge_emoji ?? "🌱"}{" "}
              {engine.currentTier?.name ?? "—"}
            </span>
            {engine.currentTier?.unlocks_wholesale && (
              <Badge variant="secondary" className="text-[10px]">
                Wholesale unlocked
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {engine.nextTier ? (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {engine.state?.successful_invites ?? 0} invites
                </span>
                <span>
                  {engine.invitesToNextTier} more →{" "}
                  <span className="font-medium text-foreground">
                    {engine.nextTier.badge_emoji} {engine.nextTier.name}
                  </span>
                </span>
              </div>
              <Progress value={engine.progressPct} className="h-2" />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              You've reached the highest tier. 🎉
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {engine.tiers.map((t) => {
              const reached =
                (engine.state?.successful_invites ?? 0) >=
                t.min_successful_invites;
              return (
                <span
                  key={t.id}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                    t.id === engine.currentTier?.id
                      ? "border-primary bg-primary/10 text-primary"
                      : reached
                        ? "border-border bg-muted text-foreground"
                        : "border-dashed border-border text-muted-foreground"
                  }`}
                >
                  {t.badge_emoji} {t.name}
                </span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Commission history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {engine.history.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              No commissions yet. Share your link to start earning.
            </p>
          ) : (
            <ScrollArea className="h-[360px]">
              <ul className="divide-y">
                {engine.history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {h.product_name ?? h.category ?? "Order commission"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(h.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums">
                        +{formatMoney(Number(h.commission_amount), engine.wallet.currency)}
                      </span>
                      <StatusPill status={h.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
