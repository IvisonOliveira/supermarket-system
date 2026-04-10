import { StockMovementType } from '@supermarket/shared';

export class StockMovementEntity {
  id: string;
  productId: string;
  type: StockMovementType;
  qty: number;
  qtyBefore: number;
  qtyAfter: number;
  reason?: string;
  saleId?: string;
  operatorId: string;
  createdAt: string;
}
