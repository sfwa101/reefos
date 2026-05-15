/**
 * RequestProductForm — submitted when search returns no results.
 * Saves to `product_requests` (Supabase). Validated with Zod.
 */
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Loader2, Send, Camera, ImagePlus, CheckCircle2 } from "lucide-react";
import { insertProductRequest } from "@/core/catalog/gateway/SovereignCatalogGateway";
import { IdentityGateway } from "@/core/identity";
import type { ProductRequestPayload } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  product_name: z.string().trim().min(2, "اسم المنتج مطلوب").max(120),
  description: z.string().trim().max(500).optional(),
  barcode: z.string().trim().max(64).optional(),
  whatsapp: z
    .string()
    .trim()
    .regex(/^[0-9+ -]{6,20}$/u, "رقم واتساب غير صالح")
    .optional()
    .or(z.literal("")),
  image_url: z.string().trim().url().optional().or(z.literal("")),
});

interface Props {
  readonly initialQuery?: string;
  readonly initialBarcode?: string;
  readonly onSubmitted?: () => void;
}

export const RequestProductForm = ({ initialQuery = "", initialBarcode = "", onSubmitted }: Props) => {
  const [productName, setProductName] = useState(initialQuery);
  const [description, setDescription] = useState("");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [showBarcode, setShowBarcode] = useState(Boolean(initialBarcode));
  const [whatsapp, setWhatsapp] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({
      product_name: productName,
      description,
      barcode,
      whatsapp,
      image_url: imageUrl,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "بيانات غير صالحة");
      return;
    }
    const uid = await IdentityGateway.getCurrentUserId();
    const payload: ProductRequestPayload = {
      product_name: parsed.data.product_name,
      description: parsed.data.description?.trim() ? parsed.data.description.trim() : null,
      barcode: parsed.data.barcode?.trim() ? parsed.data.barcode.trim() : null,
      whatsapp: parsed.data.whatsapp?.trim() ? parsed.data.whatsapp.trim() : null,
      image_url: parsed.data.image_url?.trim() ? parsed.data.image_url.trim() : null,
    };
    setLoading(true);
    const { error: dbErr } = await insertProductRequest({ ...payload, user_id: uid });
    setLoading(false);
    if (dbErr) {
      setError("تعذر إرسال الطلب، حاول لاحقاً");
      return;
    }
    setDone(true);
    onSubmitted?.();
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-primary-soft p-5 text-center">
        <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-primary" />
        <p className="font-display text-base font-extrabold">تم استلام طلبك!</p>
        <p className="mt-1 text-xs text-muted-foreground">
          سنتواصل معك فور توفر المنتج إن شاء الله.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" dir="rtl">
      <div>
        <label className="mb-1 block text-[11px] font-extrabold text-foreground/70">
          اسم المنتج <span className="text-destructive">*</span>
        </label>
        <Input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          maxLength={120}
          placeholder="مثال: زيت زيتون عضوي 1 لتر"
          className="h-11 w-full rounded-xl bg-card px-3 text-sm font-medium outline-none ring-1 ring-border/60 focus:ring-primary"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-extrabold text-foreground/70">
          وصف مختصر
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="العلامة التجارية، الحجم، أي تفاصيل…"
          className="w-full rounded-xl bg-card px-3 py-2 text-sm font-medium outline-none ring-1 ring-border/60 focus:ring-primary"
        />
      </div>

      <div>
        <Button
          type="button"
          onClick={() => setShowBarcode((v) => !v)}
          className="text-[11px] font-extrabold text-primary"
        >
          {showBarcode ? "إخفاء حقل الباركود" : "+ إضافة باركود"}
        </Button>
        {showBarcode && (
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            inputMode="numeric"
            maxLength={64}
            placeholder="الباركود (إن وُجد)"
            className="mt-1 h-11 w-full rounded-xl bg-card px-3 text-sm font-medium outline-none ring-1 ring-border/60 focus:ring-primary"
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-extrabold text-foreground/70">
          رابط صورة المنتج
        </label>
        <div className="relative">
          <ImagePlus className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            type="url"
            placeholder="https://…"
            className="h-11 w-full rounded-xl bg-card pe-10 ps-3 text-sm font-medium outline-none ring-1 ring-border/60 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-extrabold text-foreground/70">
          واتساب للتواصل
        </label>
        <Input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          inputMode="tel"
          maxLength={20}
          placeholder="01xxxxxxxxx"
          className="h-11 w-full rounded-xl bg-card px-3 text-sm font-medium outline-none ring-1 ring-border/60 focus:ring-primary"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[11px] font-extrabold text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[13px] font-extrabold text-primary-foreground shadow-pill disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        أرسل الطلب
      </Button>
      <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <Camera className="h-3 w-3" />
        يمكنك مسح باركود المنتج من شريط البحث الرئيسي
      </p>
    </form>
  );
};
