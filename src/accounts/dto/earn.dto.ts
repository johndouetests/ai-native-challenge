import { IsIn, IsInt, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { MAX_AMOUNT_MINOR, MAX_POINTS, OnlyWhen } from '../../common/validators';

type EarnBody = { type?: unknown; amountMinor?: unknown; orderId?: unknown; points?: unknown; campaignId?: unknown };

/** `{ type: "purchase", amountMinor, orderId }` or `{ type: "promo", points, campaignId }`. */
export class EarnDto {
  @IsIn(['purchase', 'promo'])
  type!: 'purchase' | 'promo';

  @ValidateIf((o: EarnBody) => o.type === 'purchase' || o.amountMinor !== undefined)
  @OnlyWhen('type', 'purchase')
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_MINOR)
  amountMinor?: number;

  @ValidateIf((o: EarnBody) => o.type === 'purchase' || o.orderId !== undefined)
  @OnlyWhen('type', 'purchase')
  @IsString()
  @Length(1, 64)
  orderId?: string;

  @ValidateIf((o: EarnBody) => o.type === 'promo' || o.points !== undefined)
  @OnlyWhen('type', 'promo')
  @IsInt()
  @Min(1)
  @Max(MAX_POINTS)
  points?: number;

  @ValidateIf((o: EarnBody) => o.type === 'promo' || o.campaignId !== undefined)
  @OnlyWhen('type', 'promo')
  @IsString()
  @Length(1, 64)
  campaignId?: string;
}
