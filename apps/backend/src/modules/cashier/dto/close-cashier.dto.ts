import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class CloseCashierDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  closing_amount: number;
}
