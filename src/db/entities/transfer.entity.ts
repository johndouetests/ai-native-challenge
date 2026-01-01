import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'transfers' })
export class TransferEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ name: 'from_user_id', type: 'text' })
  fromUserId!: string;

  @Column({ name: 'to_user_id', type: 'text' })
  toUserId!: string;

  @Column({ type: 'integer' })
  points!: number;

  @Column({ name: 'created_at', type: 'text' })
  createdAt!: string;
}
