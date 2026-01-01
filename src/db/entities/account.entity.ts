import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'accounts' })
export class AccountEntity {
  @PrimaryColumn({ name: 'user_id', type: 'text' })
  userId!: string;

  /** Cached sum of the account's ledger entries. Updated in the same transaction as the ledger. */
  @Column({ type: 'integer' })
  balance!: number;

  @Column({ name: 'updated_at', type: 'text' })
  updatedAt!: string;
}
