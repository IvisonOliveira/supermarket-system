import { Module } from '@nestjs/common';

import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { IbptService } from './services/ibpt.service';
import { CsvImportService } from './services/csv-import.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, IbptService, CsvImportService],
  exports: [ProductsService],
})
export class ProductsModule {}
