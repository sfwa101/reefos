import { memo } from "react";
import { Check } from "lucide-react";

const FEATURES = [
  "شيف خاص يحضّر وجباتك يوميًا",
  "تبديل أي وجبة قبل 24 ساعة",
  "إيقاف، تأجيل، أو تغيير في أي لحظة",
  "تخصيص كامل حسب الحساسيات",
  "توصيل مجاني خلال نافذة محددة",
  "كاش باك 5% على كل اشتراك",
];

const FeaturesList = memo(function FeaturesList() {
  return (
    <section className="glass rounded-2xl p-5 shadow-soft">
      <h3 className="mb-3 font-display text-base font-extrabold">ما يميّز اشتراكات الريف</h3>
      <ul className="space-y-2.5">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} /> {f}
          </li>
        ))}
      </ul>
    </section>
  );
});

export default FeaturesList;
