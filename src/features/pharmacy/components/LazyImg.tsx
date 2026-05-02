import { useState } from "react";

export const LazyImg = ({
  src,
  alt = "",
  className = "",
}: {
  src: string;
  alt?: string;
  className?: string;
}) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-shimmer"
          style={{
            background:
              "linear-gradient(110deg, hsl(var(--muted)) 8%, hsl(var(--muted-foreground) / 0.08) 18%, hsl(var(--muted)) 33%)",
            backgroundSize: "200% 100%",
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={768}
        height={768}
        onLoad={() => setLoaded(true)}
        className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
      />
    </>
  );
};
