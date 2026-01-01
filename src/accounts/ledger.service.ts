import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Errors } from '../common/api.exception';
import { AccountEntity, LedgerEntryEntity, LedgerKind, LedgerRefType } from '../db/entities';
import { IdGenerator } from '../db/id-generator';
import { DAILY_EARN_CAP } from '../lib/points';
import { utcDayBounds } from '../lib/clock';

export interface LedgerEntryDto {
  id: string;
  accountId: string;
  kind: LedgerKind;
  points: number;
  balanceAfter: number;
  refType: LedgerRefType;
  refId: string;
  rewardName: string | null;
  createdAt: string;
}

export function toLedgerEntryDto(entry: LedgerEntryEntity, rewardName: string | null = null): LedgerEntryDto {
  return {
    id: entry.id,
    accountId: entry.accountId,
    kind: entry.kind,
    points: entry.points,
    balanceAfter: entry.balanceAfter,
    refType: entry.refType,
    refId: entry.refId,
    rewardName,
    createdAt: entry.createdAt,
  };
}

export interface PostEntryInput {
  kind: LedgerKind;
  points: number;
  refType: LedgerRefType;
  refId: string;
  at: string;
}

/** Append-only ledger. Must be called inside a transaction. */
@Injectable()
export class LedgerService {
  constructor(private readonly ids: IdGenerator) {}

  async getAccount(manager: EntityManager, userId: string): Promise<AccountEntity> {
    const account = await manager.findOneBy(AccountEntity, { userId });
    if (!account) throw Errors.notFound('Account not found');
    return account;
  }

  /** Appends an entry and updates the cached balance. `account` is updated in place. */
  async post(manager: EntityManager, account: AccountEntity, input: PostEntryInput): Promise<LedgerEntryEntity> {
    const balanceAfter = account.balance + input.points;
    const entry: LedgerEntryEntity = {
      id: this.ids.ledgerId(),
      accountId: account.userId,
      kind: input.kind,
      points: input.points,
      balanceAfter,
      refType: input.refType,
      refId: input.refId,
      createdAt: input.at,
    };
    await manager.insert(LedgerEntryEntity, entry);
    await manager.update(
      AccountEntity,
      { userId: account.userId },
      { balance: balanceAfter, updatedAt: input.at },
    );
    account.balance = balanceAfter;
    account.updatedAt = input.at;
    return entry;
  }

  /** Throws daily_cap_exceeded when `points` would exceed the cap for the UTC day of `at`. */
  async assertWithinDailyCap(manager: EntityManager, accountId: string, points: number, at: Date): Promise<void> {
    const { start, end } = utcDayBounds(at);
    const row = await manager
      .createQueryBuilder(LedgerEntryEntity, 'e')
      .select('COALESCE(SUM(e.points), 0)', 'earned')
      .where('e.account_id = :accountId', { accountId })
      .andWhere("e.kind = 'earn'")
      .andWhere('e.created_at >= :start AND e.created_at < :end', { start, end })
      .getRawOne<{ earned: number }>();
    const earned = Number(row?.earned ?? 0);
    if (earned + points > DAILY_EARN_CAP) throw Errors.dailyCapExceeded(DAILY_EARN_CAP);
  }
}
