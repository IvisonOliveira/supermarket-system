import { IsString, IsEmail, MinLength, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsIn(['ADMIN', 'GERENTE', 'OPERADOR'])
  role: 'ADMIN' | 'GERENTE' | 'OPERADOR';
}
