import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSaleDto } from './create-sale.dto';

export class SyncSaleEntryDto extends CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsString()
  created_at: string;
}

export class SyncSalesDto {
  @ApiProperty({ type: [SyncSaleEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncSaleEntryDto)
  sales: SyncSaleEntryDto[];
}
