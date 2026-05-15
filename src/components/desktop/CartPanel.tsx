import { Link } from "@tanstack/react-router";
import { useCart, useCartLineTotals } from "@/core/orders/runtime/react/CartProvider";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { fmtMoney, toLatin } from "@/lib/format";

const CartPanel = () => {
  const { lines, total, count, setQty, remove } = useCart();

  return (
    <aside className="sticky top-[80px] hidden h-[calc(100vh-100px)] w-[320px] shrink-0 flex-col overflow-hidden rounded-3xl bg-card/60 shadow-soft ring-1 ring-border/40 lg:flex">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <p className="font-display text-base font-extrabold">سلتي</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {toLatin(count)} منتج
          </p>
        </div>
        <ShoppingBag className="h-5 w-5 text-primary" />
      </header>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
            <ShoppingBag className="h-7 w-7 text-primary" strokeWidth={2} />
          </div>
          <p className="text-sm font-bold">السلة فارغة</p>
          <p className="text-[11px] text-muted-foreground">أضف منتجات لتظهر هنا</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {lines.map((l) => (
            <CartPanelLine
              key={l.product.id}
              productId={l.product.id}
              name={l.product.name}
              image={l.product.image}
              qty={l.qty}
              setQty={setQty}
              remove={remove}
            />
          ))}
        </div>
      )}

      <footer className="border-t border-border/60 p-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-bold text-muted-foreground">الإجمالي</span>
          <span className="font-display text-lg font-extrabold text-primary tabular-nums">
            {fmtMoney(total)}
          </span>
        </div>
        <Link
          to="/cart"
          className="flex w-full items-center justify-center rounded-2xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-pill transition active:scale-[0.98]"
        >
          إتمام الطلب
        </Link>
      </footer>
    </aside>
  );
};

export default CartPanel;