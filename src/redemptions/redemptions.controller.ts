import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser, RequireRole } from '../auth/auth.decorators';
import { IdempotencyKey } from '../idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { CreateRedemptionDto } from './dto/create-redemption.dto';
import { RedemptionDto, RedemptionsService, RedemptionWithBalance } from './redemptions.service';

@Controller('v1/redemptions')
export class RedemptionsController {
  constructor(
    private readonly redemptions: RedemptionsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRedemptionDto,
    @IdempotencyKey() key: string,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const scope = this.idempotency.scope(user.id, request, key, request.body);
    return this.idempotency.execute(scope, reply, (recorder) =>
      this.redemptions.redeem(user, dto.rewardId, recorder),
    );
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ redemption: RedemptionDto }> {
    return this.redemptions.get(user, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<RedemptionWithBalance> {
    return this.redemptions.cancel(user, id);
  }

  @Post(':id/fulfill')
  @HttpCode(200)
  @RequireRole('admin')
  fulfill(@Param('id') id: string): Promise<{ redemption: RedemptionDto }> {
    return this.redemptions.fulfill(id);
  }
}
