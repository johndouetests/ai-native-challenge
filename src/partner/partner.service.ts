import { Injectable } from '@nestjs/common';
import { Errors } from '../common/api.exception';
import { LedgerEntryDto, LedgerService, toLedgerEntryDto } from '../accounts/ledger.service';
import { PartnerEventEntity, UserEntity } from '../db/entities';
import { TransactionRunner } from '../db/transaction-runner';
import { now } from '../lib/clock';
import { purchasePoints } from '../lib/points';
import { StreamService } from '../stream/stream.service';
import type { PartnerEventDto } from './dto/partner-event.dto';

export type PartnerEventResult =
  | { status: 'credited'; entry: LedgerEntryDto; balance: number }
  | { status: 'duplicate' };

@Injectable()
export class PartnerService {
  constructor(
    private readonly tx: TransactionRunner,
    private readonly ledger: LedgerService,
    private readonly stream: StreamService,
  ) {}

  /** Credits a partner purchase once per (partnerId, eventId). */
  handle(partnerId: string, dto: PartnerEventDto): Promise<PartnerEventResult> {
    return this.tx.run(async (manager, afterCommit) => {
      const seen = await manager.existsBy(PartnerEventEntity, { partnerId, eventId: dto.eventId });
      if (seen) return { status: 'duplicate' as const };

      const at = now();
      const user = await manager.findOneBy(UserEntity, { id: dto.userId });
      if (!user) throw Errors.notFound('User not found');
      const account = await this.ledger.getAccount(manager, dto.userId);
      const points = purchasePoints(dto.amountMinor, user.tier);
      await this.ledger.assertWithinDailyCap(manager, dto.userId, points, at);

      await manager.insert(PartnerEventEntity, { partnerId, eventId: dto.eventId, receivedAt: at.toISOString() });
      const entry = await this.ledger.post(manager, account, {
        kind: 'earn',
        points,
        refType: 'partner',
        refId: `${partnerId}:${dto.eventId}`,
        at: at.toISOString(),
      });
      afterCommit(() => this.stream.publishBalance(account.userId, account.balance, entry.id));
      return { status: 'credited' as const, entry: toLedgerEntryDto(entry), balance: account.balance };
    });
  }
}
