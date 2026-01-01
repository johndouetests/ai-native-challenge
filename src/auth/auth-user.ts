import type { Role } from '../db/entities';
import type { Tier } from '../lib/points';

export interface AuthUser {
  id: string;
  role: Role;
  tier: Tier;
}
