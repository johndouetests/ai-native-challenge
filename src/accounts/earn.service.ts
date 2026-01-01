import { Injectable } from '@nestjs/common';
import { Errors } from '../common/api.exception';
import { UserEntity } from '../db/entities';
import { TransactionRunner } from '../db/transaction-runner';
import type { IdempotencyRecorder } from '../idempotency/idempotency.service';
import { now } from '../lib/clock';
import { purchasePoints } from '../lib/points';
import { StreamService } from '../stream/stream.service';
import type { EarnDto } from './dto/earn.dto';
import { LedgerEntryDto, LedgerService, toLedgerEntryDto } from './ledger.service';

export interface EarnResult {
  entry: LedgerEntryDto | null;
  balance: number;
}

@Injectable()
export class EarnService {
  constructor(
    private readonly tx: TransactionRunner,
    private readonly ledger: LedgerService,
    private readonly stream: StreamService,
  ) {}

  earn(userId: string, dto: EarnDto, idempotency: IdempotencyRecorder): Promise<EarnResult> {
    return this.tx.run(async (manager, afterCommit) => {
      const at = now();
      const user = await manager.findOneBy(UserEntity, { id: userId });
      if (!user) throw Errors.notFound('User not found');
      const account = await this.ledger.getAccount(manager, userId).catch(() => null);
      if (!account) return { entry: null, balance: 0 };

      const points = dto.type === 'purchase' ? purchasePoints(dto.amountMinor!, user.tier) : dto.points!;
      await this.ledger.assertWithinDailyCap(manager, userId, points, at);

      const entry = await this.ledger.post(manager, account, {
        kind: 'earn',
        points,
        refType: dto.type,
        refId: dto.type === 'purchase' ? dto.orderId! : dto.campaignId!,
        at: at.toISOString(),
      });
      const result: EarnResult = { entry: toLedgerEntryDto(entry), balance: account.balance };
      await idempotency.record(manager, 201, result);
      afterCommit(() => this.stream.publishBalance(userId, account.balance, entry.id));
      return result;
    });
  }
}
