import { Module } from '@nestjs/common';

import { StockAlertsService } from './services/stock-alerts.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  controllers: [StockController],
  providers: [StockService, StockAlertsService],
  exports: [StockService],
})
export class StockModule {}
