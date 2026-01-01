import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Errors } from '../common/api.exception';
import { LedgerService } from '../accounts/ledger.service';
import type { AuthUser } from '../auth/auth-user';
import { AccountEntity, TransferEntity, UserEntity } from '../db/entities';
import { IdGenerator } from '../db/id-generator';
import { TransactionRunner } from '../db/transaction-runner';
import type { IdempotencyRecorder } from '../idempotency/idempotency.service';
import { nowIso } from '../lib/clock';
import { riskCheck } from '../lib/risk-check';
import { StreamService } from '../stream/stream.service';
import type { CreateTransferDto } from './dto/create-transfer.dto';

export interface TransferDto {
  id: string;
  fromUserId: string;
  toUserId: string;
  points: number;
  createdAt: string;
}

export interface TransferResult {
  transfer: TransferDto;
  balance: number;
}

@Injectable()
export class TransfersService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly tx: TransactionRunner,
    private readonly ledger: LedgerService,
    private readonly ids: IdGenerator,
    private readonly stream: StreamService,
  ) {}

  async transfer(user: AuthUser, dto: CreateTransferDto, idempotency: IdempotencyRecorder): Promise<TransferResult> {
    await riskCheck({ userId: user.id, action: 'transfer', reference: dto.toUserId });

    // Debit and credit happen in one transaction: both entries are written or neither.
    return this.tx.run(async (manager, afterCommit) => {
      const sender = await this.ledger.getAccount(manager, user.id);
      if (sender.balance < dto.points) throw Errors.insufficientPoints();

      const at = nowIso();
      const transfer: TransferEntity = {
        id: this.ids.transferId(),
        fromUserId: user.id,
        toUserId: dto.toUserId,
        points: dto.points,
        createdAt: at,
      };
      const debit = await this.ledger.post(manager, sender, {
        kind: 'transfer_out',
        points: -dto.points,
        refType: 'transfer',
        refId: transfer.id,
        at,
      });

      const receiver = await manager.findOneBy(AccountEntity, { userId: dto.toUserId });
      if (!receiver) throw Errors.receiverUnavailable();
      const credit = await this.ledger.post(manager, receiver, {
        kind: 'transfer_in',
        points: dto.points,
        refType: 'transfer',
        refId: transfer.id,
        at,
      });
      await manager.insert(TransferEntity, transfer);

      const result: TransferResult = { transfer: { ...transfer }, balance: sender.balance };
      await idempotency.record(manager, 201, result);
      afterCommit(() => {
        this.stream.publishBalance(sender.userId, sender.balance, debit.id);
        this.stream.publishBalance(receiver.userId, receiver.balance, credit.id);
      });
      return result;
    });
  }
}
