import { memo } from "react";
import type { CSSProperties } from "react";

interface Props {
  readonly gradient: string;
}

const MeatHeroComponent = ({ gradient }: Props) => {
  const style: CSSProperties = { background: gradient };
  return (
    <section className="mt-3 rounded-[2rem] p-5 shadow-tile" style={style}>
      <span className="text-[10px] font-bold text-foreground/80">قطّع كما تحب</span>
      <h2 className="font-display text-2xl font-extrabold text-foreground">
        طازج اليوم
      </h2>
      <p className="mt-1 text-xs text-foreground/70">
        يصلك مبرّداً بعربات مجهّزة
      </p>
    </section>
  );
};

export const MeatHero = memo(MeatHeroComponent);
