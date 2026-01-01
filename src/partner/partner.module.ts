import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { PartnerController } from './partner.controller';
import { PartnerSignatureGuard } from './partner-signature.guard';
import { PartnerService } from './partner.service';

@Module({
  imports: [AccountsModule],
  controllers: [PartnerController],
  providers: [PartnerService, PartnerSignatureGuard],
})
export class PartnerModule {}
