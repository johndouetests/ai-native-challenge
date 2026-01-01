import { Injectable } from '@nestjs/common';
import { Errors } from '../common/api.exception';
import { LedgerService } from '../accounts/ledger.service';
import type { AuthUser } from '../auth/auth-user';
import { assertCanAccess } from '../auth/access';
import { AccountEntity, LedgerEntryEntity, RedemptionEntity, RewardEntity } from '../db/entities';
import { IdGenerator } from '../db/id-generator';
import { TransactionRunner } from '../db/transaction-runner';
import type { IdempotencyRecorder } from '../idempotency/idempotency.service';
import { nowIso } from '../lib/clock';
import { riskCheck } from '../lib/risk-check';
import { StreamService } from '../stream/stream.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface RedemptionDto {
  id: string;
  userId: string;
  rewardId: string;
  points: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toRedemptionDto(r: RedemptionEntity): RedemptionDto {
  return {
    id: r.id,
    userId: r.userId,
    rewardId: r.rewardId,
    points: r.points,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export interface RedemptionWithBalance {
  redemption: RedemptionDto;
  balance: number;
}

@Injectable()
export class RedemptionsService {
  constructor(
    @InjectRepository(RedemptionEntity) private readonly redemptions: Repository<RedemptionEntity>,
    private readonly tx: TransactionRunner,
    private readonly ledger: LedgerService,
    private readonly ids: IdGenerator,
    private readonly stream: StreamService,
  ) {}

  async redeem(user: AuthUser, rewardId: string, idempotency: IdempotencyRecorder): Promise<RedemptionWithBalance> {
    const { balance } = await this.ledger.getAccount(this.redemptions.manager, user.id);
    await riskCheck({ userId: user.id, action: 'redeem', reference: rewardId });

    // Balance and stock are checked and changed in one transaction, with no awaits on anything else.
    return this.tx.run(async (manager, afterCommit) => {
      const reward = await manager.findOneBy(RewardEntity, { id: rewardId });
      if (!reward) throw Errors.notFound('Reward not found');
      if (!reward.active) throw Errors.rewardUnavailable();
      if (reward.stock <= 0) throw Errors.outOfStock();

      const account = await this.ledger.getAccount(manager, user.id);
      if (balance < reward.costPoints) throw Errors.insufficientPoints();

      const at = nowIso();
      const redemption: RedemptionEntity = {
        id: this.ids.redemptionId(),
        userId: user.id,
        rewardId: reward.id,
        points: reward.costPoints,
        status: 'pending',
        createdAt: at,
        updatedAt: at,
      };
      await manager.insert(RedemptionEntity, redemption);
      await manager.update(RewardEntity, { id: reward.id }, { stock: reward.stock - 1 });
      const entry = await this.ledger.post(manager, account, {
        kind: 'redeem',
        points: -reward.costPoints,
        refType: 'redemption',
        refId: redemption.id,
        at,
      });

      const result = { redemption: toRedemptionDto(redemption), balance: account.balance };
      await idempotency.record(manager, 201, result);
      afterCommit(() => this.stream.publishBalance(user.id, account.balance, entry.id));
      return result;
    });
  }

  async get(user: AuthUser, id: string): Promise<{ redemption: RedemptionDto }> {
    const redemption = await this.redemptions.findOneBy({ id });
    if (!redemption) throw Errors.notFound('Redemption not found');
    assertCanAccess(user, redemption.userId);
    return { redemption: toRedemptionDto(redemption) };
  }

  cancel(user: AuthUser, id: string): Promise<RedemptionWithBalance> {
    return this.tx.run(async (manager, afterCommit) => {
      const redemption = await manager.findOneBy(RedemptionEntity, { id });
      if (!redemption) throw Errors.notFound('Redemption not found');
      assertCanAccess(user, redemption.userId);
      if (redemption.status !== 'pending') {
        throw Errors.invalidState(`Cannot cancel a ${redemption.status} redemption`);
      }

      const at = nowIso();
      redemption.status = 'cancelled';
      redemption.updatedAt = at;
      await manager.update(RedemptionEntity, { id }, { status: 'cancelled', updatedAt: at });
      await manager.increment(RewardEntity, { id: redemption.rewardId }, 'stock', 1);

      const account = await this.ledger.getAccount(manager, redemption.userId);
      const entry = await manager.findOneByOrFail(LedgerEntryEntity, { kind: 'redeem', refId: redemption.id });
      await manager.update(LedgerEntryEntity, { id: entry.id }, { points: 0 });
      account.balance += redemption.points;
      await manager.update(AccountEntity, { userId: account.userId }, { balance: account.balance, updatedAt: at });

      afterCommit(() => this.stream.publishBalance(account.userId, account.balance, entry.id));
      return { redemption: toRedemptionDto(redemption), balance: account.balance };
    });
  }

  fulfill(id: string): Promise<{ redemption: RedemptionDto }> {
    return this.tx.run(async (manager) => {
      const redemption = await manager.findOneBy(RedemptionEntity, { id });
      if (!redemption) throw Errors.notFound('Redemption not found');
      if (redemption.status !== 'pending') {
        throw Errors.invalidState(`Cannot fulfill a ${redemption.status} redemption`);
      }
      const at = nowIso();
      redemption.status = 'fulfilled';
      redemption.updatedAt = at;
      await manager.update(RedemptionEntity, { id }, { status: 'fulfilled', updatedAt: at });
      return { redemption: toRedemptionDto(redemption) };
    });
  }
}
