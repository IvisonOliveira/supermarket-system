import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

import { RequestUser } from '../interfaces/request-user.interface';
export { RequestUser };

/**
 * Extrai o usuário (ou uma propriedade específica dele) injetado na Request pelo JwtAuthGuard
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
