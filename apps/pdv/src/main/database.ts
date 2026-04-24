import fs from 'fs';
import path from 'path';

import Database from 'better-sqlite3';
import { app } from 'electron';

// Inicializa no userData para persistir além das atualizações do app
const dbPath = path.join(app.getPath('userData'), 'pdv.db');
const db = new Database(dbPath);

// Habilita pragmas de otimização
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS local_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      barcode TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT NOT NULL,
      stock_qty REAL NOT NULL,
      image_url TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON local_products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON local_products(name);

    CREATE TABLE IF NOT EXISTS local_sales (
      id TEXT PRIMARY KEY,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      discount REAL NOT NULL,
      change REAL NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'synced')),
      created_at TEXT NOT NULL,
      synced_at TEXT
    );
  `);
}

export function insertSale(sale: any) {
  const stmt = db.prepare(`
    INSERT INTO local_sales (id, items, total, discount, change, payment_method, status, created_at)
    VALUES (@id, @items, @total, @discount, @change, @payment_method, 'pending', @created_at)
  `);
  stmt.run({
    id: sale.id,
    items: JSON.stringify(sale.items),
    total: sale.total,
    discount: sale.discount || 0,
    change: sale.change || 0,
    payment_method: sale.payment_method,
    created_at: sale.created_at,
  });
  return sale.id;
}

export function getPendingSales() {
  return db
    .prepare("SELECT * FROM local_sales WHERE status = 'pending'")
    .all()
    .map((s: any) => ({
      ...s,
      items: JSON.parse(s.items),
    }));
}

export function markSaleSynced(id: string) {
  db.prepare("UPDATE local_sales SET status = 'synced', synced_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    id,
  );
}

export function searchProducts(query: string) {
  return db
    .prepare('SELECT * FROM local_products WHERE name LIKE ? OR barcode LIKE ? LIMIT 50')
    .all(`%${query}%`, `%${query}%`);
}

export function getProductByBarcode(barcode: string) {
  return db.prepare('SELECT * FROM local_products WHERE barcode = ?').get(barcode);
}

export function getProducts() {
  return db.prepare('SELECT * FROM local_products').all();
}

export function upsertProducts(products: any[]) {
  const stmt = db.prepare(`
    INSERT INTO local_products (id, name, barcode, price, unit, stock_qty, image_url, updated_at)
    VALUES (@id, @name, @barcode, @price, @unit, @stock_qty, @image_url, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      barcode = excluded.barcode,
      price = excluded.price,
      unit = excluded.unit,
      stock_qty = excluded.stock_qty,
      image_url = excluded.image_url,
      updated_at = excluded.updated_at
  `);

  const insertMany = db.transaction((prods) => {
    for (const p of prods) {
      stmt.run({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        price: p.price,
        unit: p.unit,
        stock_qty: p.stock_qty,
        image_url: p.image_url,
        updated_at: p.updated_at,
      });
    }
  });

  insertMany(products);
}

// Inicializa logo que for carregado
initDatabase();


