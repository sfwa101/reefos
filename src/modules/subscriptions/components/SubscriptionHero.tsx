import { memo } from "react";

const SubscriptionHero = memo(function SubscriptionHero() {
  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] p-5 shadow-tile"
      style={{ background: "linear-gradient(135deg, hsl(330 60% 35%), hsl(310 50% 50%) 60%, hsl(45 70% 60%))" }}
    >
      <div className="absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
      <div className="relative">
        <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">
          عرض البداية
        </span>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-white text-balance">
          خصم 25% على<br />أول شهر اشتراك
        </h2>
        <p className="mt-1 text-xs text-white/85">إيقاف، تعديل، وتغيير في أي وقت</p>
      </div>
    </section>
  );
});

export default SubscriptionHero;
