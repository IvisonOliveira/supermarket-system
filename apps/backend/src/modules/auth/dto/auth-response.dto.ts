import { ApiProperty } from '@nestjs/swagger';

import { UserRole } from '@supermarket/shared';

class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: ['ADMIN', 'GERENTE', 'OPERADOR'] }) role: UserRole;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}
