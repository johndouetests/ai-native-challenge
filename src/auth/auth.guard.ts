import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Errors } from '../common/api.exception';
import type { Role } from '../db/entities';
import { AuthenticatedRequest, PUBLIC_ROUTE, REQUIRED_ROLE } from './auth.decorators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.auth.authenticate(AuthService.bearerToken(request.headers.authorization));
    if (!user) throw Errors.unauthorized();
    request.user = user;

    const role = this.reflector.getAllAndOverride<Role | undefined>(REQUIRED_ROLE, targets);
    if (role && user.role !== role) throw Errors.forbidden('Admin role required');
    return true;
  }
}
