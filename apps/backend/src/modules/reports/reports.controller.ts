import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'GERENTE')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Vendas agrupadas por período de tempo diário' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  async getSalesTimeline(@Query('start') start?: string, @Query('end') end?: string) {
    return this.reportsService.vendasPorPeriodo(start, end);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Lista da relevância dos Top Produtos do estoque' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopProducts(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.produtosMaisVendidos(start, end, limit || 10);
  }

  @Get('abc')
  @ApiOperation({ summary: 'Recupera o diagrama analítico da Curva ABC' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  async getABCCurve(@Query('start') start?: string, @Query('end') end?: string) {
    return this.reportsService.curvaABC(start, end);
  }

  @Get('ticket-medio')
  @ApiOperation({ summary: 'Ticket médio massificado por range do calendário' })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  async getTicketMedio(@Query('start') start?: string, @Query('end') end?: string) {
    return this.reportsService.ticketMedio(start, end);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Resumo estrito cruzando 4 métricas para um único dia' })
  @ApiQuery({ name: 'date', required: true })
  async getDailyBrief(@Query('date') date: string) {
    return this.reportsService.resumoDiario(date);
  }
}
