import { Column, Entity, PrimaryColumn } from 'typeorm';

export type LedgerKind = 'earn' | 'redeem' | 'transfer_in' | 'transfer_out' | 'reversal';
export const LEDGER_KINDS: LedgerKind[] = [
  'earn',
  'redeem',
  'transfer_in',
  'transfer_out',
  'reversal',
];

export type LedgerRefType = 'purchase' | 'promo' | 'partner' | 'redemption' | 'transfer';

@Entity({ name: 'ledger_entries' })
export class LedgerEntryEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ name: 'account_id', type: 'text' })
  accountId!: string;

  @Column({ type: 'text' })
  kind!: LedgerKind;

  /** Signed integer: positive for credits, negative for debits. */
  @Column({ type: 'integer' })
  points!: number;

  @Column({ name: 'balance_after', type: 'integer' })
  balanceAfter!: number;

  @Column({ name: 'ref_type', type: 'text' })
  refType!: LedgerRefType;

  @Column({ name: 'ref_id', type: 'text' })
  refId!: string;

  @Column({ name: 'created_at', type: 'text' })
  createdAt!: string;
}
