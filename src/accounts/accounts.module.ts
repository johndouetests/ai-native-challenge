import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { EarnService } from './earn.service';
import { LedgerQueryService } from './ledger-query.service';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [AccountsController],
  providers: [LedgerService, LedgerQueryService, EarnService],
  exports: [LedgerService],
})
export class AccountsModule {}
