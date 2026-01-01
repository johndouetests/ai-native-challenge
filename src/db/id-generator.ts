import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type Sequence = 'ledger' | 'redemption' | 'transfer';

const TABLES: Record<Sequence, { table: string; stem: string }> = {
  ledger: { table: 'ledger_entries', stem: 'le_' },
  redemption: { table: 'redemptions', stem: 'rd_' },
  transfer: { table: 'transfers', stem: 'tr_' },
};

/** Ledger ids are zero-padded so that text order equals creation order. */
const LEDGER_ID_DIGITS = 10;

export function formatLedgerId(n: number): string {
  return `le_${String(n).padStart(LEDGER_ID_DIGITS, '0')}`;
}

@Injectable()
export class IdGenerator {
  private readonly counters: Record<Sequence, number> = { ledger: 0, redemption: 0, transfer: 0 };

  constructor(private readonly dataSource: DataSource) {}

  async load(): Promise<void> {
    for (const [sequence, { table, stem }] of Object.entries(TABLES) as Array<
      [Sequence, { table: string; stem: string }]
    >) {
      const rows: Array<{ maxId: number | null }> = await this.dataSource.query(
        `SELECT MAX(CAST(SUBSTR(id, ${stem.length + 1}) AS INTEGER)) AS maxId FROM ${table}`,
      );
      this.counters[sequence] = rows[0]?.maxId ?? 0;
    }
  }

  ledgerId(): string {
    return formatLedgerId(++this.counters.ledger);
  }

  redemptionId(): string {
    return `rd_${++this.counters.redemption}`;
  }

  transferId(): string {
    return `tr_${++this.counters.transfer}`;
  }
}
