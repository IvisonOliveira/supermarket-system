import { getPendingSales, markSaleSynced, upsertProducts } from './database';

let syncInterval: NodeJS.Timeout | null = null;
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api'; // backend route prefix
let lastSyncTime = new Date(0).toISOString();

export function startSyncService() {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    try {
      // 1. Testa conectividade
      const healthRes = await fetch(`${API_URL}/health`).catch(() => null);
      if (!healthRes || !healthRes.ok) {
        return; // Offline
      }

      // 2. Sincroniza Vendas Pendentes
      const pendingSales = getPendingSales();
      if (pendingSales.length > 0) {
        const payload = {
          sales: pendingSales.map((s: any) => ({
            id: s.id,
            cashier_session_id: '00000000-0000-0000-0000-000000000000', // Mock - PDV setup needed
            items: s.items.map((i: any) => ({
              product_id: i.product_id || i.id,
              qty: i.qty || i.quantity,
              unit_price: i.unit_price || i.price,
            })),
            discount: Number(s.discount) || 0,
            change: Number(s.change) || 0,
            payment_method: s.payment_method || 'dinheiro',
            created_at: s.created_at,
          })),
        };

        const syncRes = await fetch(`${API_URL}/sales/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (syncRes.ok) {
          const data = (await syncRes.json()) as any;
          if (data && data.synced) {
            for (const id of data.synced) {
              markSaleSynced(id);
            }
          }
        }
      }

      // 3. Atualiza Produtos Locais
      const prodRes = await fetch(
        `${API_URL}/products?updated_after=${encodeURIComponent(lastSyncTime)}`,
      );
      let updatedProductsCount = 0;
      if (prodRes.ok) {
        const updatedProducts = (await prodRes.json()) as any[];
        if (updatedProducts && updatedProducts.length > 0) {
          upsertProducts(updatedProducts);
          updatedProductsCount = updatedProducts.length;
        }
      }

      lastSyncTime = new Date().toISOString();

      console.log(
        `[SYNC] ${new Date().toISOString()} | Vendas enviadas: ${pendingSales.length} | Produtos atual: ${updatedProductsCount}`,
      );
    } catch (err: any) {
      // Falha silenciosa offline
    }
  }, 30000);
}

export function stopSyncService() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
