import type { IpcMain } from 'electron';

import { IPC } from '../shared/ipc-channels';
import {
  getProducts,
  searchProducts,
  getProductByBarcode,
  insertSale,
  getPendingSales,
  markSaleSynced,
} from './database';
import { initBarcodeDetector } from './barcode-detector';
import { scaleReader } from './scale-reader';
import { SerialPort } from 'serialport';

/**
 * Registra todos os handlers IPC do processo main.
 *
 * Chamado uma única vez em `app.whenReady()`.
 * Cada handler será implementado conforme os módulos (SQLite, hardware) forem criados.
 */
export function registerIpcHandlers(ipcMain: IpcMain): void {
  // Inicializa o leitor de código de barras global
  initBarcodeDetector();
  // ── Banco de dados (SQLite via better-sqlite3) ────────────────────────────
  // TODO: substituir stubs pela implementação real em src/main/db/

  ipcMain.handle(IPC.DB_GET_PRODUCTS, async () => {
    return getProducts();
  });

  ipcMain.handle(IPC.DB_SEARCH_PRODUCTS, async (_event, query: string) => {
    return searchProducts(query);
  });

  ipcMain.handle(IPC.DB_GET_PRODUCT_BY_BARCODE, async (_event, barcode: string) => {
    return getProductByBarcode(barcode);
  });

  ipcMain.handle(IPC.DB_CREATE_SALE, async (_event, data: any) => {
    const id = insertSale(data);
    return { id };
  });

  ipcMain.handle(IPC.DB_GET_PENDING_SALES, async () => {
    return getPendingSales();
  });

  ipcMain.handle(IPC.DB_MARK_SALE_SYNCED, async (_event, id: string) => {
    markSaleSynced(id);
  });

  // ── Hardware ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SCALE_LIST_PORTS, async () => {
    return await SerialPort.list();
  });

  ipcMain.handle(IPC.SCALE_CONNECT, async (event, path: string) => {
    // Escuta os pesos e repassa para o renderer específico que conectou
    scaleReader.onWeight((weight) => {
      event.sender.send(IPC.SCALE_WEIGHT_UPDATE, weight);
    });
    return await scaleReader.connect(path);
  });

  ipcMain.handle(IPC.SCALE_DISCONNECT, async () => {
    scaleReader.disconnect();
  });

  ipcMain.handle(IPC.PRINTER_PRINT_RECEIPT, async (_event, data: unknown) => {
    // TODO: enviar cupom para impressora térmica
    void data;
  });

  // ── Sincronização ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC.SYNC_TRIGGER, async () => {
    // TODO: POST /sync com vendas pending, marcar synced após sucesso
  });
}
