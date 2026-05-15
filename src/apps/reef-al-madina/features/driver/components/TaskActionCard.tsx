/**
 * TaskActionCard — single delivery task tile with FSM advance buttons.
 *
 * Mobile-first contract:
 *   - All primary actions are full-width, ≥ 48px tall (large tap target)
 *   - High contrast on the active CTA (depends on FSM state)
 *   - Quick-access call / WhatsApp / "my location" row
 *
 * Pure presentational: receives the engine actions via props so the
 * card itself is trivially testable.
 */
import {
  CheckCircle2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Store,
  PackageCheck,
} from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateDispatchTaskStatusFn,
  recordDriverCashCollectionFn,
  type DispatchTaskAction,
} from "@/core/logistics/driver.functions";
import type {
  DriverEvent,
  DriverTask,
  OrderInfo,
} from "../types/driver.types";

function getGpsBest(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6_000 },
    );
  });
}

export const TaskActionCard = ({
  task,
  order,
  busy,
  onFire,
  onComplete,
}: {
  task: DriverTask;
  order: OrderInfo | undefined;
  busy: boolean;
  onFire: (taskId: string, ev: DriverEvent) => void;
  onComplete: (task: DriverTask) => void;
}) => {
  const phone = order?.phone ?? null;
  const address = order?.address ?? null;
  const inSurge = task.service_type === "express";
  const updateStatus = useServerFn(updateDispatchTaskStatusFn);
  const [pending, setPending] = useState<DispatchTaskAction | null>(null);
  const isBusy = busy || pending !== null;

  const mapsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  const advance = async (action: DispatchTaskAction) => {
    setPending(action);
    try {
      const fix = action !== "arrived_vendor" ? await getGpsBest() : null;
      await updateStatus({
        data: {
          nodeId: task.id,
          action,
          lat: fix?.lat ?? null,
          lng: fix?.lng ?? null,
        },
      });
      toast.success(
        action === "arrived_vendor"
          ? "تم تسجيل الوصول للمتجر"
          : action === "picked_up"
            ? "تم تسجيل الاستلام"
            : "تم تسجيل التوصيل",
      );
      // Engine subscribes to realtime; UI will refresh automatically.
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تعذّر تحديث الحالة";
      toast.error(msg);
    } finally {
      setPending(null);
    }
  };

  return (
    <Card
      className={`overflow-hidden ${inSurge ? "ring-2 ring-amber-400/60" : ""}`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-[15px] font-bold">
              {order?.full_name ?? "عميل"}
            </p>
            <p
              className="text-[12px] text-foreground-tertiary tabular-nums"
              dir="ltr"
            >
              #{task.order_id.slice(0, 8)}
            </p>
            {address && (
              <p className="text-[12px] text-foreground-secondary mt-1 line-clamp-2">
                {address}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={inSurge ? "destructive" : "secondary"}>
              {inSurge ? "سريع" : "عادي"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {task.status}
            </Badge>
          </div>
        </div>

        {/* Money / zone chips */}
        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="bg-muted rounded-md px-2 py-1">
            المبلغ: {order?.total ?? 0} ج.م
          </span>
          {task.cod_amount > 0 && (
            <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md px-2 py-1 font-bold">
              COD: {task.cod_amount}
            </span>
          )}
          {task.commission_amount > 0 && (
            <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md px-2 py-1 font-bold">
              عمولة: {task.commission_amount} ج.م
            </span>
          )}
          {task.delivery_zone && (
            <span className="bg-muted rounded-md px-2 py-1">
              {task.delivery_zone}
            </span>
          )}
        </div>

        {/* Quick contact row */}
        <div className="grid grid-cols-3 gap-2">
          {phone ? (
            <>
              <Button size="sm" variant="outline" className="h-11" asChild>
                <a href={`tel:${phone}`}>
                  <Phone className="h-4 w-4 ml-1" />
                  اتصال
                </a>
              </Button>
              <Button size="sm" variant="outline" className="h-11" asChild>
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4 ml-1" />
                  واتساب
                </a>
              </Button>
            </>
          ) : null}
          {mapsHref ? (
            <Button size="sm" variant="outline" className="h-11" asChild>
              <a href={mapsHref} target="_blank" rel="noreferrer">
                <Navigation className="h-4 w-4 ml-1" />
                خريطة
              </a>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-11"
              disabled={busy}
              onClick={() => onFire(task.id, "location_ping")}
            >
              <Navigation className="h-4 w-4 ml-1" />
              موقعي
            </Button>
          )}
        </div>

        {/* Canonical 3-step FSM (Wave D-1.B) */}
        <div className="space-y-2">
          {(task.status === "pending" || task.status === "assigned") && (
            <Button
              className="w-full h-12 text-[14px] font-extrabold"
              disabled={isBusy}
              onClick={() => advance("arrived_vendor")}
            >
              <Store className="h-4 w-4 ml-1" />
              {pending === "arrived_vendor" ? "جارٍ التسجيل..." : "وصلت للمتجر"}
            </Button>
          )}
          {(task.status === "preparing" || task.status === "ready_for_pickup") && (
            <Button
              className="w-full h-12 text-[14px] font-extrabold"
              variant="secondary"
              disabled={isBusy}
              onClick={() => advance("picked_up")}
            >
              <PackageCheck className="h-4 w-4 ml-1" />
              {pending === "picked_up" ? "جارٍ التسجيل..." : "تم الاستلام"}
            </Button>
          )}
          {(task.status === "out_for_delivery" || task.status === "arrived") && (
            <Button
              className="w-full h-12 text-[14px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isBusy}
              onClick={() => {
                if (task.cod_amount > 0) {
                  const ok = window.confirm(
                    `هل حصّلت ${task.cod_amount} ج.م نقداً؟`,
                  );
                  if (!ok) return;
                }
                if (onComplete) onComplete(task);
                void advance("delivered");
              }}
            >
              <CheckCircle2 className="h-4 w-4 ml-1" />
              {pending === "delivered" ? "جارٍ التسجيل..." : "تم التوصيل"}
            </Button>
          )}
          {task.status === "delivered" && (
            <div className="flex items-center justify-center gap-2 py-2 text-emerald-600 text-[13px] font-bold">
              <CheckCircle2 className="h-4 w-4" />
              تم التوصيل بنجاح
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
