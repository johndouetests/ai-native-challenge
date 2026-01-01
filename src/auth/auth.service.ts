import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../db/entities';
import { hashToken } from '../db/seed-data';
import type { AuthUser } from './auth-user';

@Injectable()
export class AuthService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  async authenticate(token: string | undefined): Promise<AuthUser | null> {
    if (!token) return null;
    const user = await this.users.findOneBy({ tokenHash: hashToken(token) });
    return user ? { id: user.id, role: user.role, tier: user.tier } : null;
  }

  static bearerToken(header: string | undefined): string | undefined {
    if (!header) return undefined;
    const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
    return match?.[1];
  }
}
