import { motion } from "framer-motion";
import { toLatin } from "@/lib/format";
import { ZeroFrictionButton } from "@/components/ui/ZeroFrictionButton";

type Props = {
  grand: number;
  minOrderTotal: number;
  submitting: boolean;
  onCheckout: () => void;
};

/**
 * Phase 60.1 — Zero-Friction sticky checkout bar.
 * Uses ZeroFrictionButton: tap-to-pay under 200 ج.م, hold-to-pay above.
 * Pure semantic tokens for full light/dark adaptivity.
 */
export const CartCheckoutActions = ({
  grand,
  minOrderTotal,
  submitting,
  onCheckout,
}: Props) => {
  const blocked = minOrderTotal > 0 && grand < minOrderTotal;
  return (
    <motion.div
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 240 }}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pt-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      {blocked && (
        <div className="mx-auto mb-2 max-w-md rounded-2xl border border-border bg-card px-3 py-2 text-center text-[11.5px] font-bold text-foreground shadow-sm">
          ⚠️ الحد الأدنى للطلب هو {toLatin(minOrderTotal)} ج.م — أضف بـ {toLatin(Math.ceil(minOrderTotal - grand))} ج.م لإتمام الطلب
        </div>
      )}
      <div className="mx-auto max-w-md">
        <ZeroFrictionButton
          amount={grand}
          onPay={onCheckout}
          isPending={submitting}
          disabled={blocked}
          label={
            blocked
              ? `الحد الأدنى ${toLatin(minOrderTotal)} ج.م`
              : submitting
                ? "جاري إرسال طلبك..."
                : grand > 200
                  ? `اضغط مطوّلاً للدفع · ${toLatin(grand)} ج.م`
                  : `ادفع ${toLatin(grand)} ج.م`
          }
        />
      </div>
    </motion.div>
  );
};
