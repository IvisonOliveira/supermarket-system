export type StockMovementType = 'entrada' | 'saida' | 'ajuste' | 'venda';
export interface StockMovement {
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
//# sourceMappingURL=stock.d.ts.map