import {
  createParamDecorator,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@core/prisma/generated/prisma/client';

type AuthenticatedRequest = Request & {
  user?: User;
};

export const Authorized = createParamDecorator(
  (data: keyof User, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User is not authorized');
    }

    // @Authorized('id') id:string
    return data ? user[data] : user;
  },
);
