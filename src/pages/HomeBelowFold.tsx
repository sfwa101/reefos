/**
 * HomeBelowFold — lazy-loaded below-the-fold rails.
 * Split from Home.tsx (Phase T-P1) to avoid a single-commit thrash of
 * 84 product cards. Mounted via React.lazy + <Suspense> so the top-fold
 * (deals + bestsellers) paints first, then this chunk hydrates idle.
 */
import { type CSSProperties } from "react";
import type { Product } from "@/lib/products";
import ProductCarousel from "@/components/ProductCarousel";

const cv: CSSProperties = {
  contentVisibility: "auto",
  containIntrinsicSize: "1px 360px",
};

interface Props {
  premiumBrandsRail: Product[];
  newArrivalsRail: Product[];
  bulkRail: Product[];
  quickMealsRail: Product[];
}

const HomeBelowFold = ({
  premiumBrandsRail,
  newArrivalsRail,
  bulkRail,
  quickMealsRail,
}: Props) => {
  return (
    <>
      {premiumBrandsRail.length > 0 && (
        <section style={cv}>
          <ProductCarousel
            title="علامات تجارية نثق بها"
            subtitle="منتجات مختارة من أفضل العلامات"
            accent="✨ بريميوم"
            products={premiumBrandsRail}
            seeAllTo="/sections"
          />
        </section>
      )}

      {newArrivalsRail.length > 0 && (
        <section style={cv}>
          <ProductCarousel
            title="جديد السوق"
            subtitle="أحدث ما وصل إلى رفوفنا"
            accent="🆕 وصل حديثاً"
            products={newArrivalsRail}
            seeAllTo="/sections"
          />
        </section>
      )}

      {bulkRail.length > 0 && (
        <section style={cv}>
          <ProductCarousel
            title="توفير الجملة"
            subtitle="اشترِ بالكرتونة ووفّر أكثر"
            accent="📦 سعر الجملة"
            products={bulkRail}
            seeAllTo="/store/wholesale"
          />
        </section>
      )}

      {quickMealsRail.length > 0 && (
        <section style={cv}>
          <ProductCarousel
            title="وجبات سريعة"
            subtitle="جاهزة في 30 دقيقة"
            accent="⏱️ سريع وشهي"
            products={quickMealsRail}
            seeAllTo="/store/kitchen"
          />
        </section>
      )}
    </>
  );
};

export default HomeBelowFold;
