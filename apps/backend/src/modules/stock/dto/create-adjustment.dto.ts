import { IsUUID, IsNumber, NotEquals, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdjustmentDto {
  @ApiProperty({ description: 'ID do produto no catálogo' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ 
    description: 'Quantidade somada ou subtraída. Não pode ser zero.', 
    example: -5 
  })
  @IsNumber()
  @NotEquals(0)
  qty: number;

  @ApiProperty({ 
    description: 'Justificativa do ajuste (furto, avaria, recontagem). Obrigatório.',
    example: 'Produto quebrado no mostruário.'
  })
  @IsString()
  @IsNotEmpty()
  note: string;
}
