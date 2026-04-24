import { contextBridge, ipcRenderer } from 'electron';

import { IPC } from '../shared/ipc-channels';
import type { ElectronAPI, SaleData, ReceiptData } from '../shared/ipc-channels';

// Nunca expor o ipcRenderer diretamente — usar contextBridge com API restrita.
const api: ElectronAPI = {
  auth: {
    login: (email: string, password: string) =>
      ipcRenderer.invoke(IPC.AUTH_LOGIN, email, password),
    logout: () => ipcRenderer.invoke(IPC.AUTH_LOGOUT),
    getToken: () => ipcRenderer.invoke(IPC.AUTH_GET_TOKEN),
    getUser: () => ipcRenderer.invoke(IPC.AUTH_GET_USER),
  },
  db: {
    getProducts: () => ipcRenderer.invoke(IPC.DB_GET_PRODUCTS),
    searchProducts: (query: string) => ipcRenderer.invoke(IPC.DB_SEARCH_PRODUCTS, query),
    getProductByBarcode: (barcode: string) =>
      ipcRenderer.invoke(IPC.DB_GET_PRODUCT_BY_BARCODE, barcode),
    createSale: (data: SaleData) => ipcRenderer.invoke(IPC.DB_CREATE_SALE, data),
    getPendingSales: () => ipcRenderer.invoke(IPC.DB_GET_PENDING_SALES),
    markSaleSynced: (id: string) => ipcRenderer.invoke(IPC.DB_MARK_SALE_SYNCED, id),
  },
  scale: {
    listPorts: () => ipcRenderer.invoke(IPC.SCALE_LIST_PORTS),
    connect: (path: string) => ipcRenderer.invoke(IPC.SCALE_CONNECT, path),
    disconnect: () => ipcRenderer.invoke(IPC.SCALE_DISCONNECT),
    onWeight: (cb: (weight: number) => void) => {
      const handler = (_e: any, w: number) => cb(w);
      ipcRenderer.on(IPC.SCALE_WEIGHT_UPDATE, handler);
      return () => ipcRenderer.removeListener(IPC.SCALE_WEIGHT_UPDATE, handler);
    },
  },
  printer: {
    printReceipt: (data: ReceiptData) => ipcRenderer.invoke(IPC.PRINTER_PRINT_RECEIPT, data),
  },
  barcode: {
    onScanned: (cb: (data: { code: string; isScanner: boolean }) => void) => {
      const handler = (_e: any, data: any) => cb(data);
      ipcRenderer.on(IPC.BARCODE_SCANNED, handler);
      return () => ipcRenderer.removeListener(IPC.BARCODE_SCANNED, handler);
    },
  },
  sync: {
    trigger: () => ipcRenderer.invoke(IPC.SYNC_TRIGGER),
    onStatus: (cb: (status: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: string) => cb(status);
      ipcRenderer.on(IPC.SYNC_STATUS, handler);
      // Retorna função de cleanup para evitar memory leak
      return () => ipcRenderer.removeListener(IPC.SYNC_STATUS, handler);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
