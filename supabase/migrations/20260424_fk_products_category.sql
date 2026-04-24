-- Adiciona Foreign Key para relacionar products.category_id com categories.id
ALTER TABLE public.products
ADD CONSTRAINT fk_products_category
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
