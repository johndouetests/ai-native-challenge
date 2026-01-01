import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';
import { IsDateOrDateTime } from '../../common/validators';
import { LEDGER_KINDS, type LedgerKind } from '../../db/entities';

export class LedgerQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @IsOptional()
  @IsDateOrDateTime()
  from?: string;

  @IsOptional()
  @IsDateOrDateTime()
  to?: string;

  @IsOptional()
  @IsIn(LEDGER_KINDS)
  kind?: LedgerKind;
}
