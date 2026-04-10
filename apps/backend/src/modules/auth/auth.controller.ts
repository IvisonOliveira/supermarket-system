import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário usando Supabase' })
  async login(@Body() dto: LoginDto) {
    // Chama a service com a propriedade individual desestruturada conforme requisito
    return this.authService.signIn(dto.email, dto.password);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidar a sessão do usuário no Supabase' })
  async logout(@Req() req: Request) {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    
    if (token) {
      await this.authService.signOut(token);
    }
    
    return { success: true, message: 'Logoff realizado no Supabase com sucesso.' };
  }
}
