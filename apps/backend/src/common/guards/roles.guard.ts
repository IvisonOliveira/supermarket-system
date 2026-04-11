import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestUser } from '../interfaces/request-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: RequestUser }>();

    if (!user || !user.role) {
      throw new ForbiddenException(
        'Acesso negado: Perfil de acesso ausente ou usuário não autenticado.',
      );
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Acesso negado: Essa operação requer um dos perfis [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
