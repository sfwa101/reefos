import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { GroupBuyCampaign, ResolvedTierState } from "../types/group-buy.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: GroupBuyCampaign;
  tierState: ResolvedTierState;
  onPledge: (qty: number) => Promise<{ ok: boolean; error?: string }>;
}

export const GroupBuyPledgeDialog = ({
  open,
  onOpenChange,
  campaign,
  tierState,
  onPledge,
}: Props) => {
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const escrow = (tierState.currentPrice * qty).toFixed(2);

  const handleConfirm = async () => {
    if (qty <= 0) {
      toast.error("الكمية يجب أن تكون أكبر من صفر");
      return;
    }
    setSubmitting(true);
    const res = await onPledge(qty);
    setSubmitting(false);
    if (res.ok) {
      toast.success(`تم تجميد ${escrow} ج.م في الضمان`);
      onOpenChange(false);
    } else {
      const msg = res.error ?? "تعذّر تنفيذ التعهد";
      if (msg.includes("insufficient_wallet_balance")) {
        toast.error("رصيد المحفظة غير كافٍ");
      } else if (msg.includes("campaign_expired")) {
        toast.error("انتهت مهلة هذه الحملة");
      } else if (msg.includes("campaign_not_active")) {
        toast.error("الحملة لم تعد نشطة");
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            انضم للشراء الجماعي
          </DialogTitle>
          <DialogDescription>{campaign.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">سعر الوحدة الحالي</span>
              <span className="font-medium">{tierState.currentPrice.toFixed(2)} ج.م</span>
            </div>
            {tierState.nextTier && tierState.unitsToNextDrop > 0 && (
              <div className="flex justify-between text-xs text-accent-foreground">
                <span>الخصم القادم</span>
                <span>
                  بعد {tierState.unitsToNextDrop} وحدة → {tierState.nextTier.price_per_unit.toFixed(2)} ج.م
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">الكمية</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
            />
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <p>
                سيتم <strong>تجميد</strong> المبلغ من محفظتك كضمان. إذا تحقق الهدف الجماعي يتم
                التأكيد، وإذا لم يتحقق يتم استرداد المبلغ كاملاً تلقائياً.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-primary/20 pt-2">
              <span className="text-sm font-medium">إجمالي الضمان</span>
              <span className="text-lg font-bold text-primary">{escrow} ج.م</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={submitting}>
              <CheckCircle2 className="h-4 w-4 ml-1" />
              {submitting ? "جارٍ التجميد..." : "تأكيد التعهد"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
