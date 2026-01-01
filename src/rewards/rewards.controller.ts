import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../auth/auth.decorators';
import { RewardEntity } from '../db/entities';

export interface RewardDto {
  id: string;
  name: string;
  costPoints: number;
  stock: number;
  active: boolean;
}

@Controller('v1/rewards')
export class RewardsController {
  constructor(@InjectRepository(RewardEntity) private readonly rewards: Repository<RewardEntity>) {}

  @Public()
  @Get()
  async list(): Promise<{ items: RewardDto[] }> {
    const rewards = await this.rewards.find({ order: { id: 'ASC' } });
    return {
      items: rewards.map((r) => ({
        id: r.id,
        name: r.name,
        costPoints: r.costPoints,
        stock: r.stock,
        active: Boolean(r.active),
      })),
    };
  }
}
