import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Errors } from '../common/api.exception';
import { UserEntity } from '../db/entities';
import { TransactionRunner } from '../db/transaction-runner';

export interface ProfileDto {
  id: string;
  email: string;
  displayName: string;
  role: string;
  tier: string;
  createdAt: string;
}

export function toProfileDto(user: UserEntity): ProfileDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    tier: user.tier,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly tx: TransactionRunner,
  ) {}

  async getProfile(userId: string): Promise<ProfileDto> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw Errors.notFound('User not found');
    return toProfileDto(user);
  }

  async updateDisplayName(userId: string, displayName: string): Promise<ProfileDto> {
    return this.tx.run(async (manager) => {
      await manager.update(UserEntity, { id: userId }, { displayName });
      const user = await manager.findOneBy(UserEntity, { id: userId });
      if (!user) throw Errors.notFound('User not found');
      return toProfileDto(user);
    });
  }
}
