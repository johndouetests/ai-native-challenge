import { IsString, Length } from 'class-validator';

export class CreateRedemptionDto {
  @IsString()
  @Length(1, 64)
  rewardId!: string;
}
