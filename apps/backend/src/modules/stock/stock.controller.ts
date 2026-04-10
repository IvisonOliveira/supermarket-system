import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { StockService } from './stock.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementResponseDto } from './dto/movement-response.dto';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('movements')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Registrar movimentação manual de estoque' })
  @ApiResponse({ status: 201, type: MovementResponseDto })
  createMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: RequestUser,
  ): Promise<MovementResponseDto> {
    return this.stockService.createMovement(dto, user.id);
  }

  @Get('movements')
  @Roles('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Listar movimentações de estoque' })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['entrada', 'saida', 'ajuste', 'venda'] })
  @ApiResponse({ status: 200, type: [MovementResponseDto] })
  findMovements(
    @Query('productId') productId?: string,
    @Query('type') type?: string,
  ): Promise<MovementResponseDto[]> {
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
  @ApiOperation({ summary: 'Posição atual de estoque de um produto' })
  findByProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.stockService.getPosition(productId);
  }
}
