import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockMovementType } from '@supermarket/shared';

export class MovementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty({ enum: ['entrada', 'saida', 'ajuste', 'venda'] }) type: StockMovementType;
  @ApiProperty() qty: number;
  @ApiProperty() qtyBefore: number;
  @ApiProperty() qtyAfter: number;
  @ApiPropertyOptional() reason?: string;
  @ApiPropertyOptional() saleId?: string;
  @ApiProperty() operatorId: string;
  @ApiProperty() createdAt: string;
}
