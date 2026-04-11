export type ProductUnit = 'un' | 'kg' | 'l';
export interface Category {
  id: string;
  parent_id?: string | null;
  name: string;
  description?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
export interface Product {
  id: string;
  category_id?: string | null;
  barcode: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  price: number;
  cost: number;
  stock_qty: number;
  stock_min: number;
  unit: ProductUnit;
  image_url?: string | null;
  ncm: string;
  cfop: string;
  cest?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
//# sourceMappingURL=product.d.ts.map
