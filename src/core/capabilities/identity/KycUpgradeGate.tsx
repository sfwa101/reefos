/**
 * KycUpgradeGate — Phase 19, Doctrine 9.
 *
 * The Sovereign Soft-Wall. Intercepts a Level-1 Resident when they try to
 * touch identity-grade surfaces (Tayseer Wallet, Business persona) and walks
 * them through National-ID hydration to upgrade to Sovereign Citizen.
 *
 * Flow:
 *   1. Renders children unconditionally if `profile.is_kyc_verified`.
 *   2. Otherwise renders a `<Sheet>` that explains the upgrade and shows the
 *      Algorithmic Hydration form (Doctrine 9.1) — no manual DOB / gender /
 *      birthplace; the 14-digit ID *is* the identity payload.
 *   3. Modesty Protocol (Doctrine 9.4) — if the decoded gender is female, the
 *      flow strictly bypasses real-photo upload and presents the Sovereign
 *      Avatar Library. Males upload a real-world photo for commercial trust.
 *   4. On submit, writes `national_id`, `short_id`, `governorate`, decoded
 *      `birth_date`/`gender`, `avatar_kind`, `is_kyc_verified=true` and
 *      `kyc_verified_at = now()` to the user's profile.
 *
 * Use as wrapper:  <KycUpgradeGate><WalletPage/></KycUpgradeGate>
 * Use as trigger:  const { request } = useKycGate(); request(() => doX());
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Sparkles, Camera, Lock, CheckCircle2, Loader2, User as UserIcon, Heart, Star, Flower2, Crown, Gem } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { IdentityGateway } from "@/core/identity/gateway/IdentityGateway";
import { MediaGateway } from "@/core/media";
import { decodeEgyptianId, normalizeIdInput, type DecodedEgyptianId } from "./egyptianIdDecoder";
import { useSovereignOverride } from "@/hooks/useSovereignOverride";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 6 Sovereign Avatar slots for the Modesty Library (female-only path).
const SOVEREIGN_AVATARS = [
  { key: "rose",   icon: Flower2, label: "وردة" },
  { key: "star",   icon: Star,    label: "نجمة" },
  { key: "heart",  icon: Heart,   label: "قلب" },
  { key: "crown",  icon: Crown,   label: "تاج" },
  { key: "gem",    icon: Gem,     label: "جوهرة" },
  { key: "spark",  icon: Sparkles,label: "بريق" },
];

type Props = {
  children: React.ReactNode;
  /** Friendly label shown in the gate ("المحفظة"، "واجهة الأعمال" …). */
  reason?: string;
  /** When true, the gate shows even if the user has no profile yet (safety). */
  forceWhenNoProfile?: boolean;
};

const KycUpgradeGate = ({ children, reason = "هذه الميزة", forceWhenNoProfile = true }: Props) => {
  const { user, profile, refreshProfile } = useAuth();
  const hasSovereignOverride = useSovereignOverride();
  const isVerified = !!profile?.is_kyc_verified;
  const needs = !isVerified && (forceWhenNoProfile || !!profile) && !hasSovereignOverride;

  const [open, setOpen] = useState<boolean>(needs);
  useEffect(() => { setOpen(needs); }, [needs]);

  const [rawId, setRawId] = useState("");
  const [avatarKey, setAvatarKey] = useState<string>("rose");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const decoded: DecodedEgyptianId = useMemo(() => decodeEgyptianId(rawId), [rawId]);
  const idDigits = normalizeIdInput(rawId);

  const submit = useCallback(async () => {
    if (!user) { toast.error("سجّل الدخول أولاً"); return; }
    if (!decoded.isValid) { toast.error("الرقم القومي غير صحيح"); return; }
    if (decoded.gender === "male" && !photoFile) {
      toast.error("صورة شخصية مطلوبة لتفعيل التحقق");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        national_id: idDigits,
        short_id: decoded.shortId,
        governorate: decoded.governorate,
        birth_date: decoded.dob,
        gender: decoded.gender,
        avatar_kind: decoded.gender === "female" ? "sovereign_avatar" : "real_photo",
        avatar_key: decoded.gender === "female" ? avatarKey : null,
        is_kyc_verified: true,
        kyc_verified_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
      // Optional: stash the male photo into avatars bucket. We tolerate failures.
      if (decoded.gender === "male" && photoFile) {
        try {
          const path = `${user.id}/kyc_${Date.now()}.jpg`;
          const { publicUrl } = await MediaGateway.uploadFile({
            bucket: "avatars",
            path,
            file: photoFile,
            contentType: photoFile.type,
            upsert: true,
          });
          if (publicUrl) {
            await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
          }
        } catch { /* non-fatal: photo can be re-uploaded from settings */ }
      }
      await refreshProfile();
      toast.success("تم التوثيق — أهلاً بك في المواطنة السيادية");
      setOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "تعذّر إكمال التوثيق";
      toast.error(msg.includes("duplicate") ? "هذا الرقم القومي مسجّل لحساب آخر" : msg);
    } finally {
      setBusy(false);
    }
  }, [user, decoded, idDigits, avatarKey, photoFile, refreshProfile]);

  // Verified users — and Sovereign admins — see the wrapped surface untouched.
  if (isVerified || hasSovereignOverride) return <>{children}</>;

  return (
    <>
      {/* Render a placeholder behind the sheet so the route stays mounted. */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">{children}</div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] border-t-0 px-5 pb-7 pt-5 max-h-[92vh] overflow-y-auto"
          dir="rtl"
        >
          <SheetHeader className="text-right">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <ShieldCheck className="h-7 w-7" strokeWidth={2.2} />
            </div>
            <SheetTitle className="font-display text-lg font-extrabold">
              ترقية إلى المواطنة السيادية
            </SheetTitle>
            <SheetDescription className="text-[12.5px] leading-relaxed text-muted-foreground">
              لفتح <b className="text-foreground">{reason}</b> والمميزات السيادية، يرجى توثيق هويتك الوطنية.
              بياناتك مشفّرة ولن تُشارَك خارج النظام.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            {/* National ID */}
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-bold text-muted-foreground">الرقم القومي (14 رقم)</span>
              <Input
                value={rawId}
                onChange={(e) => setRawId(normalizeIdInput(e.target.value))}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={14}
                dir="ltr"
                placeholder="••••••••••••••"
                className="h-12 rounded-2xl text-center font-mono text-base tracking-[0.22em] tabular-nums"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {idDigits.length}/14
              </span>
            </label>

            {/* Decoded preview */}
            <AnimatePresence>
              {decoded.isValid && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/10"
                >
                  <div className="flex items-center gap-2 text-[12px] text-primary">
                    <CheckCircle2 className="h-4 w-4" /> تم التحقّق من البنية
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-[11.5px]">
                    <Field label="تاريخ الميلاد" value={decoded.dob} />
                    <Field label="المحافظة" value={decoded.governorate} />
                    <Field label="النوع" value={decoded.gender === "female" ? "أنثى" : "ذكر"} />
                  </dl>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Modesty Protocol */}
            <AnimatePresence mode="wait">
              {decoded.isValid && decoded.gender === "female" && (
                <motion.div key="female" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-bold">
                    <Lock className="h-3.5 w-3.5 text-primary" /> اختاري صورتك السيادية
                  </div>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    حمايةً للخصوصية، النظام لا يطلب صورتك الحقيقية.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {SOVEREIGN_AVATARS.map((a) => {
                      const Icon = a.icon;
                      const active = avatarKey === a.key;
                      return (
                        <Button
                          key={a.key}
                          type="button"
                          onClick={() => setAvatarKey(a.key)}
                          className={cn(
                            "flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl ring-1 transition active:scale-[0.97]",
                            active
                              ? "bg-primary text-primary-foreground ring-primary shadow-pill"
                              : "bg-card text-foreground/80 ring-border/60 hover:bg-foreground/[0.04]",
                          )}
                        >
                          <Icon className="h-6 w-6" strokeWidth={2.2} />
                          <span className="text-[10.5px] font-semibold">{a.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {decoded.isValid && decoded.gender === "male" && (
                <motion.div key="male" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-bold">
                    <Camera className="h-3.5 w-3.5 text-primary" /> صورة شخصية حقيقية
                  </div>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    تُستخدم لبناء الثقة التجارية في معاملاتك.
                  </p>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background/60 py-6 text-[12.5px] text-muted-foreground transition hover:bg-foreground/[0.03]">
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                    />
                    {photoFile ? (
                      <span className="inline-flex items-center gap-2 font-bold text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" /> {photoFile.name.slice(0, 28)}
                      </span>
                    ) : (
                      <>
                        <UserIcon className="h-4 w-4" />
                        اضغط لالتقاط أو اختيار صورة
                      </>
                    )}
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="button"
              onClick={submit}
              disabled={!decoded.isValid || busy}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-display text-sm font-extrabold text-primary-foreground shadow-pill transition active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {busy ? "جاري التحقّق…" : "تفعيل المواطنة السيادية"}
            </Button>

            <p className="text-center text-[10.5px] text-muted-foreground">
              يمكنك المتابعة كـ <b>مقيم</b> دون توثيق، لكن المحفظة ستبقى مغلقة.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

const Field = ({ label, value }: { label: string; value: string | null }) => (
  <div className="rounded-xl bg-background/60 p-2">
    <div className="text-[10px] text-muted-foreground">{label}</div>
    <div className="mt-0.5 font-bold text-foreground">{value ?? "—"}</div>
  </div>
);

export default KycUpgradeGate;
