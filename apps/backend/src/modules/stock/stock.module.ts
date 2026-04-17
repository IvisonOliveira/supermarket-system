import { Module } from '@nestjs/common';

import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockAlertsService } from './services/stock-alerts.service';

@Module({
  controllers: [StockController],
  providers: [StockService, StockAlertsService],
  exports: [StockService],
})
export class StockModule {}
