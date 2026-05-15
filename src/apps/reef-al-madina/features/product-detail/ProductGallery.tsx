import { useEffect, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ChevronLeft, ChevronRight, Heart, Share2, X, ZoomIn,
} from "lucide-react";

interface Props {
  images: string[];
  productName: string;
  productId: string;
  isVillage: boolean;
  fav: boolean;
  toggleFav: (id: string) => void;
  onBack: () => void;
  onShare: () => void;
}

/**
 * Hero image gallery with swipeable slides, dot indicators, zoom lightbox,
 * and (for village products) glassmorphism floating chrome.
 * Verbatim extraction from ProductDetail.tsx.
 */
const ProductGallery = memo(function ProductGallery({
  images, productName, productId, isVillage, fav, toggleFav, onBack, onShare,
}: Props) {
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  const goPrev = () => {
    const next = (galleryIndex - 1 + images.length) % images.length;
    setGalleryIndex(next);
    galleryRef.current?.scrollTo({ left: next * (galleryRef.current.clientWidth || 0), behavior: "smooth" });
  };
  const goNext = () => {
    const next = (galleryIndex + 1) % images.length;
    setGalleryIndex(next);
    galleryRef.current?.scrollTo({ left: next * (galleryRef.current.clientWidth || 0), behavior: "smooth" });
  };

  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / (el.clientWidth || 1));
      setGalleryIndex((prev) => (prev === idx ? prev : idx));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <section className={isVillage ? "" : "space-y-2"}>
        <div
          className={
            isVillage
              ? "relative -mx-4 -mt-4 overflow-hidden bg-secondary/30"
              : "relative overflow-hidden rounded-[1.75rem] bg-secondary/30 shadow-tile"
          }
        >
          <div
            ref={galleryRef}
            className={
              isVillage
                ? "flex w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
                : "flex aspect-square w-full snap-x snap-mandatory overflow-x-auto no-scrollbar"
            }
            style={isVillage ? { height: "55vh" } : undefined}
          >
            {images.map((src, i) => (
              <Button
                key={i}
                type="button"
                onClick={() => setZoomOpen(true)}
                className="relative block h-full w-full shrink-0 snap-center"
                style={{ width: "100%" }}
              >
                <img
                  src={src}
                  alt={`${productName} - ${i + 1}`}
                  className="h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-105"
                />
              </Button>
            ))}
          </div>

          {isVillage && (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
              style={{ background: "linear-gradient(180deg, transparent, rgba(40,35,18,0.45))" }}
            />
          )}

          {isVillage && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <Button
                onClick={onBack}
                aria-label="رجوع"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow-soft ring-1 ring-white/30 transition active:scale-90"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={onShare}
                  aria-label="مشاركة"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow-soft ring-1 ring-white/30 transition active:scale-90"
                >
                  <Share2 className="h-4 w-4" strokeWidth={2.4} />
                </Button>
                <Button
                  onClick={() => toggleFav(productId)}
                  aria-label="مفضلة"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white shadow-soft ring-1 ring-white/30 transition active:scale-90"
                >
                  <Heart className={`h-4 w-4 transition ${fav ? "fill-white" : ""}`} strokeWidth={2.4} />
                </Button>
              </div>
            </div>
          )}

          {images.length > 1 && !isVillage && (
            <>
              <Button
                onClick={goPrev}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-soft ring-1 ring-border/40 transition active:scale-90"
                aria-label="السابق"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
              </Button>
              <Button
                onClick={goNext}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground shadow-soft ring-1 ring-border/40 transition active:scale-90"
                aria-label="التالي"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
              </Button>
            </>
          )}

          {!isVillage && (
            <Button
              onClick={() => setZoomOpen(true)}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-[10px] font-extrabold text-foreground shadow-soft ring-1 ring-border/40"
            >
              <ZoomIn className="h-3 w-3" strokeWidth={2.6} />
              تكبير
            </Button>
          )}

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === galleryIndex
                    ? isVillage ? "w-5 bg-white" : "w-5 bg-primary"
                    : isVillage ? "w-1.5 bg-white/50" : "w-1.5 bg-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {zoomOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setZoomOpen(false)}
          >
            <motion.img
              src={images[galleryIndex]}
              alt={productName}
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="max-h-[88vh] max-w-[92vw] cursor-zoom-out object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              onClick={() => setZoomOpen(false)}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 transition active:scale-90"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" strokeWidth={2.4} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default ProductGallery;
