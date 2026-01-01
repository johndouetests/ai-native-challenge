import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1767225600000 implements MigrationInterface {
  name = 'InitSchema1767225600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
        tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      )`);
    await queryRunner.query(`
      CREATE TABLE accounts (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        balance INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      )`);
    await queryRunner.query(`
      CREATE TABLE ledger_entries (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(user_id),
        kind TEXT NOT NULL CHECK (kind IN ('earn', 'redeem', 'transfer_in', 'transfer_out', 'reversal')),
        points INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        ref_type TEXT NOT NULL,
        ref_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`);
    await queryRunner.query(
      `CREATE INDEX idx_ledger_account_created ON ledger_entries (account_id, created_at DESC, id DESC)`,
    );
    await queryRunner.query(`
      CREATE TABLE rewards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cost_points INTEGER NOT NULL,
        stock INTEGER NOT NULL,
        active BOOLEAN NOT NULL
      )`);
    await queryRunner.query(`
      CREATE TABLE redemptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        reward_id TEXT NOT NULL REFERENCES rewards(id),
        points INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`);
    await queryRunner.query(`
      CREATE TABLE transfers (
        id TEXT PRIMARY KEY,
        from_user_id TEXT NOT NULL REFERENCES users(id),
        to_user_id TEXT NOT NULL REFERENCES users(id),
        points INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )`);
    await queryRunner.query(`
      CREATE TABLE idempotency_keys (
        user_id TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        response_status INTEGER NOT NULL,
        response_body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, method, path, key)
      )`);
    await queryRunner.query(`
      CREATE TABLE partner_events (
        partner_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        received_at TEXT NOT NULL,
        PRIMARY KEY (partner_id, event_id)
      )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'partner_events',
      'idempotency_keys',
      'transfers',
      'redemptions',
      'rewards',
      'ledger_entries',
      'accounts',
      'users',
    ]) {
      await queryRunner.query(`DROP TABLE ${table}`);
    }
  }
}
