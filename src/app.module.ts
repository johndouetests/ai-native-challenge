import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { loggerOptions } from './common/logger';
import type { AppConfig } from './config/app-config';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { PartnerModule } from './partner/partner.module';
import { RedemptionsModule } from './redemptions/redemptions.module';
import { RewardsModule } from './rewards/rewards.module';
import { StreamModule } from './stream/stream.module';
import { TransfersModule } from './transfers/transfers.module';
import { UsersModule } from './users/users.module';

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.forRoot(config),
        LoggerModule.forRoot(loggerOptions(config)),
        DatabaseModule,
        AuthModule,
        IdempotencyModule,
        StreamModule,
        HealthModule,
        UsersModule,
        AccountsModule,
        RewardsModule,
        RedemptionsModule,
        TransfersModule,
        PartnerModule,
      ],
    };
  }
}
