import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductUnit } from '../entities/product.entity';

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() barcode: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() price: number;
  @ApiProperty() costPrice: number;
  @ApiProperty() stockQty: number;
  @ApiProperty() stockMin: number;
  @ApiProperty({ enum: ['UN', 'KG', 'LT', 'CX'] }) unit: ProductUnit;
  @ApiProperty() ncm: string;
  @ApiProperty() cfop: string;
  @ApiPropertyOptional() cest?: string;
  @ApiProperty() active: boolean;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}
