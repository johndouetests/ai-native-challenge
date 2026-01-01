import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager, ObjectLiteral, EntityTarget } from 'typeorm';
import {
  AccountEntity,
  LedgerEntryEntity,
  RedemptionEntity,
  RewardEntity,
  TransferEntity,
  UserEntity,
} from './entities';
import { IdGenerator } from './id-generator';
import { buildSeedData } from './seed-data';

const CHUNK = 50;

/** Seeds an empty database and primes id sequences before the app accepts traffic. */
@Injectable()
export class DatabaseBootstrap implements OnModuleInit {
  private readonly logger = new Logger(DatabaseBootstrap.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly ids: IdGenerator,
  ) {}

  async onModuleInit(): Promise<void> {
    const users = await this.dataSource.getRepository(UserEntity).count();
    if (users === 0) {
      await this.seed();
    }
    await this.ids.load();
  }

  private async seed(): Promise<void> {
    const data = buildSeedData();
    await this.dataSource.transaction(async (manager) => {
      await insertChunked(manager, UserEntity, data.users);
      await insertChunked(manager, AccountEntity, data.accounts);
      await insertChunked(manager, RewardEntity, data.rewards);
      await insertChunked(manager, RedemptionEntity, data.redemptions);
      await insertChunked(manager, TransferEntity, data.transfers);
      await insertChunked(manager, LedgerEntryEntity, data.ledger);
    });
    this.logger.log(
      `seeded ${data.users.length} users, ${data.rewards.length} rewards, ${data.ledger.length} ledger entries`,
    );
  }
}

async function insertChunked<T extends ObjectLiteral>(
  manager: EntityManager,
  entity: EntityTarget<T>,
  rows: T[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await manager.insert(entity, rows.slice(i, i + CHUNK));
  }
}
