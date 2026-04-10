import { ApiProperty } from '@nestjs/swagger';

import { UserRole } from '@supermarket/shared';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: ['ADMIN', 'GERENTE', 'OPERADOR'] }) role: UserRole;
  @ApiProperty() active: boolean;
  @ApiProperty() createdAt: string;
}
