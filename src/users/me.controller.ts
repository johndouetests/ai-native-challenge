import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/auth.decorators';
import { UpdateMeDto } from './dto/update-me.dto';
import { ProfileDto, UsersService } from './users.service';

@Controller('v1/me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<ProfileDto> {
    return this.users.getProfile(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto): Promise<ProfileDto> {
    return this.users.updateDisplayName(user.id, dto.displayName);
  }
}
