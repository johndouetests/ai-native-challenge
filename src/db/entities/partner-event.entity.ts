import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'partner_events' })
export class PartnerEventEntity {
  @PrimaryColumn({ name: 'partner_id', type: 'text' })
  partnerId!: string;

  @PrimaryColumn({ name: 'event_id', type: 'text' })
  eventId!: string;

  @Column({ name: 'received_at', type: 'text' })
  receivedAt!: string;
}
