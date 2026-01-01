import { IsInt, IsString, Length, Max, Min } from 'class-validator';
import { MAX_AMOUNT_MINOR } from '../../common/validators';

export class PartnerEventDto {
  @IsString()
  @Length(1, 128)
  eventId!: string;

  @IsString()
  @Length(1, 64)
  userId!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_MINOR)
  amountMinor!: number;
}
