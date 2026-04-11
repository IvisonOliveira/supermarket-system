import { Module } from '@nestjs/common';

import { SalesModule } from '../sales/sales.module';

import { CashierController } from './cashier.controller';
import { CashierService } from './cashier.service';

@Module({
  imports: [SalesModule],
  controllers: [CashierController],
  providers: [CashierService],
  exports: [CashierService],
})
export class CashierModule {}
