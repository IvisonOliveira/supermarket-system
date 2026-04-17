import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class CreateEntryDto {
  @ApiProperty({ description: 'ID do produto no catálogo' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ description: 'Quantidade adicionada no estoque. Deve ser positvo.', example: 10 })
  @IsNumber()
  @Min(0.001)
  qty: number;

  @ApiPropertyOptional({ description: 'Nota Fiscal associada à entrada' })
  @IsString()
  @IsOptional()
  nf_number?: string;

  @ApiPropertyOptional({ description: 'Anotações livres sobre a entrada' })
  @IsString()
  @IsOptional()
  note?: string;
}
