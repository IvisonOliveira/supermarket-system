CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
  id uuid,
  name text,
  sku text,
  barcode text,
  stock_qty numeric,
  stock_min numeric,
  image_url text,
  category_id uuid
)
LANGUAGE sql
STABLE
AS $$
  SELECT id, name, sku, barcode, stock_qty, stock_min, image_url, category_id
  FROM products
  WHERE active = true
    AND stock_qty <= stock_min;
$$;
