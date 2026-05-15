// KYC verification gate dialog used by the borrow flow.

import { ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PALETTE } from "../data";
import { Button } from "@/components/ui/button";

export const KYCGateDialog = ({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: PALETTE.primarySoft }}>
            <ShieldCheck className="h-7 w-7" style={{ color: PALETTE.primary }} />
          </div>
          <DialogTitle className="text-center font-display text-lg">ميزة حصرية للموثقين</DialogTitle>
          <DialogDescription className="text-center text-sm">
            هذه الميزة الحصرية تتطلب توثيق هويتك بالرقم القومي لحماية الكتب وضمان إعادتها بأمان.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex gap-2">
          <Button
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-2xl bg-foreground/5 py-3 text-sm font-bold text-foreground"
          >
            لاحقاً
          </Button>
          <Button
            onClick={() => { onOpenChange(false); navigate({ to: "/account/verification" }); }}
            className="flex-1 rounded-2xl py-3 text-sm font-extrabold text-white"
            style={{ background: PALETTE.primary }}
          >
            وثّق الآن
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
