import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, SaleStatus } from '@supermarket/shared';

class SaleItemResponseDto {
  @ApiProperty() productId: string;
  @ApiProperty() barcode: string;
  @ApiProperty() name: string;
  @ApiProperty() qty: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() discount: number;
  @ApiProperty() total: number;
}

export class SaleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() cashierId: string;
  @ApiProperty() operatorId: string;
  @ApiProperty({ type: [SaleItemResponseDto] }) items: SaleItemResponseDto[];
  @ApiProperty() subtotal: number;
  @ApiProperty() discount: number;
  @ApiProperty() total: number;
  @ApiProperty({ enum: ['dinheiro', 'credito', 'debito', 'pix', 'voucher'] })
  paymentMethod: PaymentMethod;
  @ApiProperty() paymentAmount: number;
  @ApiProperty() change: number;
  @ApiProperty({ enum: ['pending', 'synced', 'cancelled'] }) status: SaleStatus;
  @ApiPropertyOptional() nfceKey?: string;
  @ApiProperty() createdAt: string;
  @ApiPropertyOptional() syncedAt?: string;
}
