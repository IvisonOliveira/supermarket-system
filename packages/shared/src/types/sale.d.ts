export type SaleStatus = 'pending' | 'synced' | 'cancelled';
export type PaymentMethod = 'dinheiro' | 'credito' | 'debito' | 'pix' | 'voucher';
export interface SaleItem {
    productId: string;
    barcode: string;
    name: string;
    qty: number;
    unitPrice: number;
    discount: number;
    total: number;
}
export interface Sale {
    id: string;
    cashierId: string;
    operatorId: string;
    items: SaleItem[];
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
//# sourceMappingURL=sale.d.ts.map