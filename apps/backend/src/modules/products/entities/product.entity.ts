export type ProductUnit = 'UN' | 'KG' | 'LT' | 'CX';

export class ProductEntity {
  id: string;
  barcode: string;
  name: string;
  description?: string;
  price: number;
  costPrice: number;
  stockQty: number;
  stockMin: number;
  unit: ProductUnit;
  // Campos fiscais — revisar manualmente conforme NCM do produto
  ncm: string;
  cfop: string;
  cest?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
