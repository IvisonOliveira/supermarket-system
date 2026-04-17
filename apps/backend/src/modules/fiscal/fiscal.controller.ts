import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { FiscalService } from './fiscal.service';
import { CertificateService } from './services/certificate.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fiscal')
export class FiscalController {
  constructor(
    private readonly fiscalService: FiscalService,
    private readonly certificateService: CertificateService,
  ) {}

  @Post('nfce/:saleId')
  @Roles('ADMIN', 'GERENTE', 'OPERADOR')
  async emitirNFCe(@Param('saleId') saleId: string) {
    return this.fiscalService.emitirNFCe(saleId);
  }

  @Get('nfce/:accessKey')
  @Roles('ADMIN', 'GERENTE', 'OPERADOR')
  async consultarNFCe(@Param('accessKey') accessKey: string) {
    return this.fiscalService.consultarNFCe(accessKey);
  }

  @Delete('nfce/:accessKey')
  @Roles('ADMIN', 'GERENTE')
  async cancelarNFCe(
    @Param('accessKey') accessKey: string,
    @Body('justificativa') justificativa: string,
  ) {
    return this.fiscalService.cancelarNFCe(accessKey, justificativa);
  }

  @Get()
  @Roles('ADMIN', 'GERENTE')
  async listAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.fiscalService.findAll(from, to, status);
  }

  @Post('certificate')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificate(
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password?: string,
  ) {
    if (!file || !password) throw new BadRequestException('Arquivo .pfx e senha são obrigatórios');
    if (!file.originalname.toLowerCase().endsWith('.pfx'))
      throw new BadRequestException('Formato de certificado deve ser apenas .pfx');
    return this.certificateService.upload(file.buffer, password);
  }

  @Get('certificate/status')
  @Roles('ADMIN', 'GERENTE')
  async getCertificateStatus() {
    return this.certificateService.getStatus();
  }
}
