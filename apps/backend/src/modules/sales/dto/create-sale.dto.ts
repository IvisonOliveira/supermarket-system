import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @ApiProperty()
  @IsUUID()
  product_id: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  qty: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  unit_price: number;
}

export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  cashier_session_id: string;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  discount: number = 0;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  change: number = 0;

  @ApiProperty({ enum: ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'] })
  @IsEnum(['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'])
  payment_method: string;
}
