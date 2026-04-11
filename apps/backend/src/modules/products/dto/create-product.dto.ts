import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiProperty({ enum: ['un', 'kg', 'l'] })
  @IsIn(['un', 'kg', 'l'])
  unit: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  category_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ncm?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cest?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cfop?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock_qty: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock_min: number = 0;
}
