import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Errors } from '../common/api.exception';
import { isDateOnly } from '../common/validators';
import { AccountEntity, LedgerEntryEntity, RedemptionEntity, RewardEntity } from '../db/entities';
import type { LedgerKind, LedgerRefType } from '../db/entities';
import type { AuthUser } from '../auth/auth-user';
import { assertCanAccess } from '../auth/access';
import type { LedgerQueryDto } from './dto/ledger-query.dto';
import type { LedgerEntryDto } from './ledger.service';

export const DEFAULT_PAGE_SIZE = 20;

export interface LedgerPage {
  items: LedgerEntryDto[];
  nextCursor: string | null;
}

export interface BalanceDto {
  userId: string;
  balance: number;
  updatedAt: string;
}

interface Cursor {
  createdAt: string;
  id: string;
}

interface LedgerRow {
  id: string;
  accountId: string;
  kind: LedgerKind;
  points: number;
  balanceAfter: number;
  refType: LedgerRefType;
  refId: string;
  createdAt: string;
  rewardName: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `from`: a date means 00:00:00.000Z of that UTC day; a date-time is used as given (inclusive). */
export function fromBound(from: string): string {
  return isDateOnly(from) ? `${from}T00:00:00.000Z` : new Date(from).toISOString();
}

/** `to`: a date includes the whole UTC day (exclusive next midnight); a date-time is inclusive. */
export function toBound(to: string): { op: '<' | '<='; value: string } {
  if (isDateOnly(to)) {
    const start = Date.parse(`${to}T00:00:00.000Z`);
    return { op: '<', value: new Date(start + DAY_MS).toISOString() };
  }
  return { op: '<=', value: new Date(to).toISOString() };
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify([cursor.createdAt, cursor.id])).toString('base64url');
}

export function decodeCursor(raw: string): Cursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      typeof parsed[0] === 'string' &&
      typeof parsed[1] === 'string'
    ) {
      return { createdAt: parsed[0], id: parsed[1] };
    }
  } catch {
    // fall through
  }
  throw Errors.invalidBody('Invalid cursor', [{ field: 'cursor', messages: ['cursor is malformed'] }]);
}

@Injectable()
export class LedgerQueryService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
  ) {}

  async getBalance(user: AuthUser, userId: string): Promise<BalanceDto> {
    const account = await this.findAccessibleAccount(user, userId);
    return { userId: account.userId, balance: account.balance, updatedAt: account.updatedAt };
  }

  async list(user: AuthUser, userId: string, query: LedgerQueryDto): Promise<LedgerPage> {
    await this.findAccessibleAccount(user, userId);
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;

    // One query per page: reward names come from a join, not from per-row lookups.
    const qb = this.dataSource
      .createQueryBuilder()
      .select([
        'e.id AS id',
        'e.account_id AS accountId',
        'e.kind AS kind',
        'e.points AS points',
        'e.balance_after AS balanceAfter',
        'e.ref_type AS refType',
        'e.ref_id AS refId',
        'e.created_at AS createdAt',
        'w.name AS rewardName',
      ])
      .from(LedgerEntryEntity, 'e')
      .leftJoin(
        RedemptionEntity,
        'r',
        "e.kind IN ('redeem', 'reversal') AND e.ref_type = 'redemption' AND r.id = e.ref_id",
      )
      .leftJoin(RewardEntity, 'w', 'w.id = r.reward_id')
      .where('e.account_id = :userId', { userId });

    if (query.kind) qb.andWhere('e.kind = :kind', { kind: query.kind });
    if (query.from) qb.andWhere('e.created_at >= :from', { from: fromBound(query.from) });
    if (query.to) {
      const { op, value } = toBound(query.to);
      qb.andWhere(`e.created_at ${op} :to`, { to: value });
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      qb.andWhere('e.created_at < :cursorCreatedAt', {
        cursorCreatedAt: cursor.createdAt,
        cursorId: cursor.id,
      });
    }

    const rows = await qb
      .orderBy('e.created_at', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .limit(limit + 1)
      .getRawMany<LedgerRow>();

    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        kind: row.kind,
        points: Number(row.points),
        balanceAfter: Number(row.balanceAfter),
        refType: row.refType,
        refId: row.refId,
        rewardName: row.rewardName ?? null,
        createdAt: row.createdAt,
      })),
      nextCursor: rows.length > limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    };
  }

  private async findAccessibleAccount(user: AuthUser, userId: string): Promise<AccountEntity> {
    const account = await this.accounts.findOneBy({ userId });
    if (!account) throw Errors.notFound('Account not found');
    assertCanAccess(user, userId);
    return account;
  }
}
