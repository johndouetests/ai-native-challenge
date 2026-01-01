import { Errors } from '../common/api.exception';
import type { AuthUser } from './auth-user';

/** A user may access resources they own; admins may access everything. */
export function canAccess(user: AuthUser, ownerId: string): boolean {
  return user.role === 'admin' || user.id === ownerId;
}

export function assertCanAccess(user: AuthUser, ownerId: string): void {
  if (!canAccess(user, ownerId)) throw Errors.forbidden();
}
