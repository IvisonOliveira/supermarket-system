import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, Min } from 'class-validator';

export class OpenCashierDto {
  @ApiProperty()
  @IsUUID()
  cashier_id: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  opening_amount: number;
}
