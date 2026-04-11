import { Module } from '@nestjs/common';
import { FiscalService } from './fiscal.service';
import { CertificateService } from './services/certificate.service';
import { FiscalController } from './fiscal.controller';
import { SalesModule } from '../sales/sales.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [SalesModule, ProductsModule],
  controllers: [FiscalController],
  providers: [FiscalService, CertificateService],
  exports: [FiscalService, CertificateService],
})
export class FiscalModule {}
