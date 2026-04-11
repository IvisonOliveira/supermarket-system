import type { SaleStatus, PaymentMethod } from '@supermarket/shared';

export class SaleItemEntity {
  productId: string;
  barcode: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export class SaleEntity {
  id: string; // UUID gerado no cliente (PDV)
  cashierId: string;
  operatorId: string;
  items: SaleItemEntity[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentAmount: number;
  change: number;
  status: SaleStatus;
  nfceKey?: string;
  createdAt: string;
  syncedAt?: string;
}
