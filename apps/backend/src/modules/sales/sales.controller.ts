import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SyncSalesDto } from './dto/sync-sales.dto';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nova venda' })
  @ApiResponse({ status: 201 })
  create(
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.salesService.create(dto, user.id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'GERENTE', 'OPERADOR')
  @ApiOperation({ summary: 'Sincronizar vendas offline do PDV' })
  @ApiResponse({ status: 200 })
  sync(@Body() dto: SyncSalesDto) {
    return this.salesService.sync(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar vendas por período' })
  @ApiQuery({ name: 'start', required: false, description: 'ISO date start' })
  @ApiQuery({ name: 'end', required: false, description: 'ISO date end' })
  @ApiQuery({ name: 'cashierId', required: false })
  @ApiResponse({ status: 200 })
  findByPeriod(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.salesService.findByPeriod(start, end, cashierId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar venda por ID' })
  @ApiResponse({ status: 200 })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findById(id);
  }

  @Patch(':id/cancel')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Cancelar venda (até 30 min após emissão)' })
  @ApiResponse({ status: 200 })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.salesService.cancel(id, user.id);
  }
}
