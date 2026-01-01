import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser } from '../auth/auth-user';
import { CurrentUser, RequireRole } from '../auth/auth.decorators';
import { IdempotencyKey } from '../idempotency/idempotency-key.decorator';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { EarnDto } from './dto/earn.dto';
import { LedgerQueryDto } from './dto/ledger-query.dto';
import { EarnService } from './earn.service';
import { BalanceDto, LedgerPage, LedgerQueryService } from './ledger-query.service';

@Controller('v1/accounts')
export class AccountsController {
  constructor(
    private readonly ledgerQuery: LedgerQueryService,
    private readonly earnService: EarnService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Get(':userId/balance')
  balance(@CurrentUser() user: AuthUser, @Param('userId') userId: string): Promise<BalanceDto> {
    return this.ledgerQuery.getBalance(user, userId);
  }

  @Get(':userId/ledger')
  ledger(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Query() query: LedgerQueryDto,
  ): Promise<LedgerPage> {
    return this.ledgerQuery.list(user, userId, query);
  }

  @Post(':userId/earn')
  @HttpCode(201)
  @RequireRole('admin')
  earn(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: EarnDto,
    @IdempotencyKey() key: string,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<unknown> {
    const scope = this.idempotency.scope(user.id, request, key, request.body);
    return this.idempotency.execute(scope, reply, (recorder) => this.earnService.earn(userId, dto, recorder));
  }
}
