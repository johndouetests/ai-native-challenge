import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Role } from '../db/entities';
import type { AuthUser } from './auth-user';

export const PUBLIC_ROUTE = 'auth:public';
export const REQUIRED_ROLE = 'auth:role';

/** Route does not require a bearer token. */
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);

/** Route requires the given role (checked after authentication). */
export const RequireRole = (role: Role) => SetMetadata(REQUIRED_ROLE, role);

export type AuthenticatedRequest = FastifyRequest & { user?: AuthUser };

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user!;
});
