/**
 * Canais IPC compartilhados entre o processo main e o renderer.
 *
 * Centralizar aqui evita strings mágicas espalhadas no código e garante
 * que preload.ts e ipc-handlers.ts usem sempre os mesmos nomes de canal.
 */

// ── Nomes de canal ──────────────────────────────────────────────────────────

export const IPC = {
  // Banco de dados local (SQLite)
  DB_GET_PRODUCTS: 'db:getProducts',
  DB_SEARCH_PRODUCTS: 'db:searchProducts',
  DB_GET_PRODUCT_BY_BARCODE: 'db:getProductByBarcode',
  DB_CREATE_SALE: 'db:createSale',
  DB_GET_PENDING_SALES: 'db:getPendingSales',
  DB_MARK_SALE_SYNCED: 'db:markSaleSynced',

  // Hardware
  SCALE_LIST_PORTS: 'scale:listPorts',
  SCALE_CONNECT: 'scale:connect',
  SCALE_DISCONNECT: 'scale:disconnect',
  SCALE_WEIGHT_UPDATE: 'scale:weightUpdate',
  PRINTER_PRINT_RECEIPT: 'printer:printReceipt',
  BARCODE_SCANNED: 'barcode:scanned',

  // Sincronização com o backend
  SYNC_TRIGGER: 'sync:trigger',
  SYNC_STATUS: 'sync:status', // canal de evento (main → renderer)
} as const;

// ── Tipos de dados ──────────────────────────────────────────────────────────

export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock_qty: number;
  unit: string;
}

export interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface SaleData {
  id: string; // UUID gerado no cliente
  cashier_id: string;
  operator_id: string;
  items: SaleItem[];
  total: number;
  payment_method: 'cash' | 'card' | 'pix';
  created_at: string; // ISO 8601
}

export interface ReceiptData {
  sale: SaleData;
  store_name: string;
  store_cnpj: string;
}

// ── Interface da API exposta pelo preload ───────────────────────────────────

export interface ElectronAPI {
  db: {
    getProducts: () => Promise<Product[]>;
    searchProducts: (query: string) => Promise<Product[]>;
    getProductByBarcode: (barcode: string) => Promise<Product | null>;
    createSale: (data: SaleData) => Promise<{ id: string }>;
    getPendingSales: () => Promise<SaleData[]>;
    markSaleSynced: (id: string) => Promise<void>;
  };
  scale: {
    listPorts: () => Promise<any[]>;
    connect: (path: string) => Promise<boolean>;
    disconnect: () => Promise<void>;
    onWeight: (cb: (weight: number) => void) => () => void;
  };
  printer: {
    printReceipt: (data: ReceiptData) => Promise<void>;
  };
  barcode: {
    onScanned: (cb: (data: { code: string; isScanner: boolean }) => void) => () => void;
  };
  sync: {
    trigger: () => Promise<void>;
    /** Registra um listener para atualizações de status do sync. Retorna uma função de cleanup. */
    onStatus: (cb: (status: string) => void) => () => void;
  };
}
