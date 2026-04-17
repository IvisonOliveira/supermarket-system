import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('entry')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Registrar entrada de mercadorias no estoque' })
  @ApiResponse({ status: 201, description: 'Entrada registrada com sucesso' })
  createEntry(@Body() dto: CreateEntryDto, @CurrentUser() user: RequestUser) {
    return this.stockService.createEntry(dto, user.id);
  }

  @Post('adjustment')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Registrar ajuste (positivo/negativo) de estoque manual' })
  @ApiResponse({ status: 201, description: 'Ajuste registrado com sucesso' })
  createAdjustment(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: RequestUser) {
    return this.stockService.createAdjustment(dto, user.id);
  }

  @Get('movements')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Listar movimentações de estoque' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['entrada', 'saida', 'ajuste', 'venda'] })
  @ApiResponse({ status: 200, description: 'Lista de movimentações' })
  findMovements(@Query('productId') productId?: string, @Query('type') type?: string) {
    return this.stockService.findMovements({ productId, type });
  }

  @Get('low')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Produtos com estoque abaixo do mínimo' })
  @ApiResponse({ status: 200, description: 'Lista de produtos com stock_qty <= stock_min' })
  findLowStock() {
    return this.stockService.findLowStock();
  }

  @Get(':productId')
  @Roles('ADMIN', 'GERENTE', 'OPERADOR')
  @ApiOperation({ summary: 'Posição atual de estoque de um produto' })
  findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.stockService.getPosition(productId);
  }

  @Get('alerts/pending')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Lista os alertas não lidos gerados pelo sistema diário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de alertas contendo informações do produto acopladas',
  })
  async getPendingAlerts() {
    // Usamos um import global ou injeção. Para otimizar, como o Controller só tem StockService,
    // farei a subchamada dentro de StockService ou em stock-alerts.service?
    // Como a lógica do BD não deve sujar o Controller, farei via StockService.
    return this.stockService.getPendingAlerts();
  }

  @Patch('alerts/:id/acknowledge')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Reconhece o alerta desativando a notificação' })
  @ApiResponse({ status: 200, description: 'Alerta marcado como lidou' })
  async acknowledgeAlert(@Param('id', ParseUUIDPipe) id: string) {
    return this.stockService.acknowledgeAlert(id);
  }
}
