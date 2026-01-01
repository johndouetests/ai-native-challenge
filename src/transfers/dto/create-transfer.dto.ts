import { IsNumber, IsString, Length, Max } from 'class-validator';
import { MAX_POINTS } from '../../common/validators';

export class CreateTransferDto {
  @IsString()
  @Length(1, 64)
  toUserId!: string;

  @IsNumber()
  @Max(MAX_POINTS)
  points!: number;
}
