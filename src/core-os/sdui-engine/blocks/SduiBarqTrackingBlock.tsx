/**
 * SduiBarqTrackingBlock — Live delivery tracking ribbon.
 * Injected by HakimGenerativeOverlay when the user has an active order.
 */
import { memo } from "react";
import { Truck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { SduiBarqTrackingBlock as Props } from "../engine/schemas";

function Impl({ block }: { block: Props }) {
  return (
    <Link
      to="/account/orders"
      dir="rtl"
      className="flex items-center justify-between gap-3 rounded-3xl border border-emerald-300/60 bg-gradient-to-l from-emerald-500/10 to-transparent px-4 py-3 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15">
          <Truck className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <div className="text-sm font-extrabold text-foreground">
            {block.props.title ?? "طلبك في الطريق"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {block.props.subtitle ?? "اضغط للمتابعة المباشرة"}
          </div>
        </div>
      </div>
      <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-extrabold text-white">
        مباشر
      </span>
    </Link>
  );
}

export const SduiBarqTrackingBlock = memo(Impl);
