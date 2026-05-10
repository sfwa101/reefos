import { useEffect, useRef, useState } from "react";
import type { MediaRefVM } from "@/core/catalog/types";
import { srcSet, sizesAttr } from "./MediaResolver";

interface Props {
  media: MediaRefVM;
  className?: string;
  eager?: boolean;
}

/**
 * LazyImage — IntersectionObserver-based lazy image مع blurhash placeholder
 * لطيف (CSS background fallback). جاهز للاستبدال بمكتبة blurhash لاحقاً.
 */
export function LazyImage({ media, className, eager }: Props) {
  const ref = useRef<HTMLImageElement | null>(null);
  const [visible, setVisible] = useState(eager === true);

  useEffect(() => {
    if (eager || visible || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [eager, visible]);

  return (
    <img
      ref={ref}
      src={visible ? media.url : undefined}
      srcSet={visible ? srcSet(media.url) : undefined}
      sizes={sizesAttr()}
      alt={media.alt.ar}
      width={media.width}
      height={media.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={{
        backgroundColor: "hsl(var(--muted))",
      }}
    />
  );
}
