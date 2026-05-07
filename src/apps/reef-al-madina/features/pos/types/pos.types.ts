export type PosProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  barcode: string | null;
  image_url: string | null;
  category: string;
};

export type PosCartLine = {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  image_url: string | null;
};

export type PosShift = {
  id: string;
  branch_id: string | null;
  cashier_id: string;
  status: "open" | "closed";
  opening_balance: number;
  closing_balance: number | null;
  expected_balance: number | null;
  discrepancy: number | null;
  total_sales: number;
  total_orders: number;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
};
