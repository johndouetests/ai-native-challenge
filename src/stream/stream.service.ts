import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import type { AuthUser } from '../auth/auth-user';
import { AuthService } from '../auth/auth.service';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { AccountEntity } from '../db/entities';

export const STREAM_PATH = '/v1/stream';
export const CLOSE_UNAUTHORIZED = 4401;

interface StreamClient {
  socket: WebSocket;
  user: AuthUser;
  subscriptions: Set<string>;
  lastPingAt: number;
  lastPongAt: number;
}

function rawToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data)).toString('utf8');
  return data.toString('utf8');
}

type ClientMessage = { type: 'subscribe' | 'unsubscribe'; accountId: string } | { type: 'pong' };

@Injectable()
export class StreamService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(StreamService.name);
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly clients = new Set<StreamClient>();
  private readonly subscribers = new Map<string, Set<StreamClient>>();
  private readonly seqByAccount = new Map<string, number>();
  private heartbeat?: NodeJS.Timeout;

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly auth: AuthService,
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  get connectionCount(): number {
    return this.clients.size;
  }

  onApplicationBootstrap(): void {
    const server = this.adapterHost.httpAdapter.getHttpServer() as import('node:http').Server;
    server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      this.handleUpgrade(request, socket, head).catch((error: unknown) => {
        this.logger.error(error instanceof Error ? error : String(error));
        socket.destroy();
      });
    });
    const tick = Math.max(25, Math.min(1000, Math.floor(this.config.wsPingIntervalMs / 4)));
    this.heartbeat = setInterval(() => this.runHeartbeat(), tick);
    this.heartbeat.unref();
  }

  async beforeApplicationShutdown(): Promise<void> {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.logger.log(`shutting down: closing ${this.clients.size} stream connection(s)`);
    const closing = [...this.clients].map(
      (client) =>
        new Promise<void>((resolve) => {
          client.socket.once('close', () => resolve());
          client.socket.close(1001, 'server shutting down');
          setTimeout(() => {
            client.socket.terminate();
            resolve();
          }, 500).unref();
        }),
    );
    await Promise.all(closing);
    this.wss.close();
  }

  /** Sends `balance.updated` to subscribers of the account. Call only after the transaction committed. */
  publishBalance(accountId: string, balance: number, entryId: string): void {
    const seq = (this.seqByAccount.get(accountId) ?? 0) + 1;
    this.seqByAccount.set(accountId, seq);
    const event = { type: 'balance.updated', accountId, balance, entryId, seq };
    for (const client of this.subscribers.get(accountId) ?? []) {
      this.send(client, event);
    }
  }

  private async handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== STREAM_PATH) {
      socket.destroy();
      return;
    }
    const user = await this.auth.authenticate(url.searchParams.get('token') ?? undefined);
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      if (!user) {
        ws.close(CLOSE_UNAUTHORIZED, 'unauthorized');
        return;
      }
      this.register(ws, user);
    });
  }

  private register(socket: WebSocket, user: AuthUser): void {
    const now = Date.now();
    const client: StreamClient = { socket, user, subscriptions: new Set(), lastPingAt: now, lastPongAt: now };
    this.clients.add(client);
    socket.on('message', (data: RawData) => {
      this.onMessage(client, data).catch((error: unknown) => {
        this.logger.error(error instanceof Error ? error : String(error));
        this.send(client, { type: 'error', code: 'internal_error', message: 'Internal server error' });
      });
    });
    socket.on('close', () => this.remove(client));
    socket.on('error', (error) => {
      this.logger.warn(`stream socket error for ${user.id}: ${error.message}`);
      this.remove(client);
    });
    this.logger.log(`stream connected: ${user.id}`);
  }

  private async onMessage(client: StreamClient, data: RawData): Promise<void> {
    let message: ClientMessage;
    try {
      message = this.parse(data);
    } catch (error) {
      this.send(client, {
        type: 'error',
        code: 'invalid_message',
        message: error instanceof Error ? error.message : 'Invalid message',
      });
      return;
    }

    switch (message.type) {
      case 'pong':
        client.lastPongAt = Date.now();
        return;
      case 'unsubscribe':
        this.unsubscribe(client, message.accountId);
        this.send(client, { type: 'unsubscribed', accountId: message.accountId });
        return;
      case 'subscribe':
        await this.subscribe(client, message.accountId);
        return;
    }
  }

  private async subscribe(client: StreamClient, accountId: string): Promise<void> {
    const exists = await this.accounts.existsBy({ userId: accountId });
    if (!exists) {
      this.send(client, { type: 'error', code: 'not_found', message: 'Account not found' });
      return;
    }
    if (client.socket.readyState !== WebSocket.OPEN) return;
    client.subscriptions.add(accountId);
    let set = this.subscribers.get(accountId);
    if (!set) {
      set = new Set();
      this.subscribers.set(accountId, set);
    }
    set.add(client);
    this.send(client, { type: 'subscribed', accountId });
  }

  private unsubscribe(client: StreamClient, accountId: string): void {
    client.subscriptions.delete(accountId);
    const set = this.subscribers.get(accountId);
    set?.delete(client);
    if (set && set.size === 0) this.subscribers.delete(accountId);
  }

  private parse(data: RawData): ClientMessage {
    const parsed: unknown = JSON.parse(rawToString(data));
    if (parsed === null || typeof parsed !== 'object') throw new Error('Message must be a JSON object');
    const { type, accountId } = parsed as Record<string, unknown>;
    if (type === 'pong') return { type };
    if (type === 'subscribe' || type === 'unsubscribe') {
      if (typeof accountId !== 'string' || accountId.length === 0 || accountId.length > 64) {
        throw new Error('accountId must be a non-empty string');
      }
      return { type, accountId };
    }
    throw new Error('Unknown message type');
  }

  private runHeartbeat(): void {
    const now = Date.now();
    for (const client of this.clients) {
      if (now - client.lastPongAt > this.config.wsPongTimeoutMs) {
        this.logger.log(`stream heartbeat timeout: ${client.user.id}`);
        client.socket.terminate();
        this.remove(client);
        continue;
      }
      if (now - client.lastPingAt >= this.config.wsPingIntervalMs) {
        client.lastPingAt = now;
        this.send(client, { type: 'ping' });
      }
    }
  }

  private remove(client: StreamClient): void {
    if (!this.clients.delete(client)) return;
    for (const accountId of client.subscriptions) this.unsubscribe(client, accountId);
    this.logger.log(`stream disconnected: ${client.user.id}`);
  }

  private send(client: StreamClient, payload: object): void {
    if (client.socket.readyState !== WebSocket.OPEN) return;
    try {
      client.socket.send(JSON.stringify(payload));
    } catch (error) {
      this.logger.warn(`stream send failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
