import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SupabaseConfig } from '../../config/supabase.config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseConfig,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user: unknown }>();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token nao fornecido');
    }

    const parts = authHeader.split(' ');
    const type = parts[0];
    const token = parts[1];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de token invalido');
    }

    const { data, error } = await this.supabase.client.auth.getUser(token);

    if (error || !data?.user) {
      throw new UnauthorizedException('Token invalido ou expirado');
    }

    request.user = data.user;
    return true;
  }
}
