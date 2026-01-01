import { IsString, Length } from 'class-validator';

export class UpdateMeDto {
  @IsString()
  @Length(1, 60)
  displayName!: string;
}
