import { Module } from '@nestjs/common';

import { ProductsModule } from '../products/products.module';
import { SalesModule } from '../sales/sales.module';

import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';
import { CertificateService } from './services/certificate.service';

@Module({
  imports: [SalesModule, ProductsModule],
  controllers: [FiscalController],
  providers: [FiscalService, CertificateService],
  exports: [FiscalService, CertificateService],
})
export class FiscalModule {}
