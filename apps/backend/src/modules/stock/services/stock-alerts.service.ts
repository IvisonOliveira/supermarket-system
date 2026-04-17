import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line import/no-unresolved
import { Cron } from '@nestjs/schedule';

import { SupabaseConfig } from '../../../config/supabase.config';
import { StockService } from '../stock.service';

@Injectable()
export class StockAlertsService {
  private readonly logger = new Logger(StockAlertsService.name);

  constructor(
    private readonly stockService: StockService,
    private readonly supabaseConfig: SupabaseConfig,
  ) {}

  private get supabase() {
    return this.supabaseConfig.serviceClient;
  }

  // Executa diariamente às 8h da manhã
  @Cron('0 8 * * *', {
    name: 'stock_low_alerts',
    timeZone: 'America/Sao_Paulo',
  })
  async generateDailyAlerts() {
    this.logger.log('[CRON-8AM] Iniciando escaneamento de estoques baixos...');

    try {
      const lowStockProducts = await this.stockService.findLowStock();

      if (lowStockProducts.length === 0) {
        this.logger.log('[CRON-8AM] Nenhum produto em perigo detectado.');
        return;
      }

      this.logger.log(
        `[CRON-8AM] ${lowStockProducts.length} produtos mapeados com saldo <= mínimo. Checando alertas em aberto.`,
      );

      for (const product of lowStockProducts) {
        // Verifica se já existe um alerta *não lido* para evitar SPAM
        const { data: existingAlerts, error: checkErr } = await this.supabase
          .from('stock_alerts')
          .select('id')
          .eq('product_id', product.id)
          .eq('acknowledged', false)
          .limit(1);

        if (checkErr) {
          this.logger.error(`[CRON-8AM] Falha ao verificar aviso do produto ${product.id}`);
          continue;
        }

        // Se NÃO há alerta ativo, insere o ticket!
        if (!existingAlerts || existingAlerts.length === 0) {
          const { error: insErr } = await this.supabase.from('stock_alerts').insert({
            product_id: product.id,
            current_qty: product.stock_qty,
            min_qty: product.stock_min,
          });

          if (insErr) {
            this.logger.error(
              `[CRON-8AM] Falha ao abrir alerta para ${product.name}: ${insErr.message}`,
            );
          }
        }
      }

      this.logger.log('[CRON-8AM] Varredura de alertas de estoque finalizada com sucesso.');
    } catch (e: any) {
      this.logger.error(`[CRON-8AM] Erro fatal na rotina de alertas: ${e.message}`);
    }
  }
}
