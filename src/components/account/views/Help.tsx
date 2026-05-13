import BackHeader from "@/components/BackHeader";
import { Phone, MessageCircle, Mail, HelpCircle, ChevronLeft } from "lucide-react";

const faq = [
  { q: "كيف يتم التوصيل؟", a: "خلال ساعتين داخل القاهرة الكبرى." },
  { q: "هل يمكنني إلغاء الاشتراك؟", a: "نعم، في أي وقت من قسم الاشتراكات." },
  { q: "ما هي وسائل الدفع؟", a: "بطاقات Visa/Master، محفظة ريف، الدفع عند الاستلام." },
  { q: "كيف أعيد منتجًا؟", a: "اضغط 'إعادة' في الطلب خلال 24 ساعة." },
];

const Help = () => (
  <div className="space-y-5">
    <BackHeader title="المساعدة والدعم" subtitle="نحن هنا 24/7" accent="حسابي" />

    <div className="grid grid-cols-3 gap-3">
      <a href="tel:+201080068689" className="glass-strong flex flex-col items-center gap-2 rounded-2xl p-4 shadow-soft">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft"><Phone className="h-5 w-5 text-primary" /></div>
        <span className="text-[11px] font-bold">اتصال</span>
      </a>
      <a href="https://wa.me/201080068689" target="_blank" rel="noreferrer" className="glass-strong flex flex-col items-center gap-2 rounded-2xl p-4 shadow-soft">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft"><MessageCircle className="h-5 w-5 text-primary" /></div>
        <span className="text-[11px] font-bold">واتساب</span>
      </a>
      <a href="mailto:hello@reef.app" className="glass-strong flex flex-col items-center gap-2 rounded-2xl p-4 shadow-soft">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft"><Mail className="h-5 w-5 text-primary" /></div>
        <span className="text-[11px] font-bold">بريد</span>
      </a>
    </div>

    <section>
      <h3 className="mb-3 px-1 font-display text-base font-extrabold flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary" /> الأسئلة الشائعة
      </h3>
      <div className="glass-strong divide-y divide-border rounded-2xl shadow-soft">
        {faq.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer items-center justify-between p-4 text-sm font-bold">
              {f.q}
              <ChevronLeft className="h-4 w-4 -rotate-90 text-muted-foreground transition group-open:rotate-90" />
            </summary>
            <p className="px-4 pb-4 text-xs text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  </div>
);

export default Help;
