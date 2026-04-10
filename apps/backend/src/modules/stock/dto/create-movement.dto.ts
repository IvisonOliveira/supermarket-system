import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

import { StockMovementType } from '@supermarket/shared';

export class CreateMovementDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: ['entrada', 'saida', 'ajuste'] })
  @IsEnum(['entrada', 'saida', 'ajuste'])
  type: Exclude<StockMovementType, 'venda'>; // 'venda' é criado internamente pelo SalesService

  @ApiProperty({ example: 50 })
  @IsNumber()
  @IsPositive()
  qty: number;

  @ApiPropertyOptional({ example: 'Reposição de fornecedor' })
  @IsOptional()
  @IsString()
  reason?: string;
}
