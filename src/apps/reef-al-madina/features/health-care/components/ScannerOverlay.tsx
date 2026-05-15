import { useEffect } from "react";
import { Camera, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ScannerOverlay = ({ onClose }: { onClose: () => void }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div onClick={onClose} className="absolute inset-0 animate-overlay-fade bg-black/70" aria-hidden />
      <div className="relative animate-overlay m-4 w-full max-w-sm overflow-hidden rounded-[28px] bg-background ring-1 ring-border/60">
        <Button
          onClick={onClose}
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/95 text-foreground shadow-pill ring-1 ring-border/50"
        >
          <X className="h-4 w-4" />
        </Button>
        <div
          className="relative flex h-72 items-center justify-center overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, hsl(168 55% 22%) 0%, hsl(195 55% 22%) 100%)",
          }}
        >
          <div className="relative h-44 w-44 rounded-3xl ring-2 ring-white/40">
            <span className="absolute -inset-1 rounded-[28px] ring-1 ring-white/15" />
            <span
              className="absolute inset-x-3 top-1/2 h-[2px] -translate-y-1/2 animate-scan rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(160 90% 70%), transparent)",
              }}
            />
            <Camera className="absolute inset-0 m-auto h-12 w-12 text-white/85" strokeWidth={1.6} />
          </div>
        </div>
        <div className="p-5 text-center">
          <h3 className="font-display text-[18px] font-extrabold text-foreground">
            وجّه الكاميرا نحو عبوة الدواء
          </h3>
          <p className="mt-1.5 text-[12px] font-medium text-muted-foreground">
            سنحلل الباركود والاسم التجاري لإظهار التفاعلات والبدائل خلال ثوانٍ
          </p>
          <Button
            onClick={() => {
              onClose();
              toast("الماسح في وضع التجربة", { description: "سيتم تفعيله مع تحديث الكاميرا" });
            }}
            className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[12.5px] font-extrabold text-primary-foreground active:scale-95"
          >
            <ScanLine className="h-4 w-4" /> ابدأ المسح
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScannerOverlay;
