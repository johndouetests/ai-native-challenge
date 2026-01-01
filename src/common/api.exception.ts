export type ErrorCode =
  | 'invalid_body'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'idempotency_key_required'
  | 'idempotency_key_reuse'
  | 'request_in_progress'
  | 'insufficient_points'
  | 'out_of_stock'
  | 'reward_unavailable'
  | 'invalid_state'
  | 'self_transfer'
  | 'receiver_unavailable'
  | 'daily_cap_exceeded'
  | 'stale_timestamp'
  | 'internal_error';

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

export class ApiException extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiException';
  }

  toBody(): ErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details === undefined ? {} : { details: this.details }),
      },
    };
  }
}

export const Errors = {
  invalidBody: (message: string, details?: unknown) =>
    new ApiException(400, 'invalid_body', message, details),
  unauthorized: (message = 'Missing or invalid credentials') =>
    new ApiException(401, 'unauthorized', message),
  forbidden: (message = 'You do not have access to this resource') =>
    new ApiException(403, 'forbidden', message),
  notFound: (message = 'Resource not found') => new ApiException(404, 'not_found', message),
  idempotencyKeyRequired: () =>
    new ApiException(400, 'idempotency_key_required', 'Idempotency-Key header is required'),
  idempotencyKeyReuse: () =>
    new ApiException(
      422,
      'idempotency_key_reuse',
      'Idempotency-Key was already used with a different request body',
    ),
  requestInProgress: () =>
    new ApiException(
      409,
      'request_in_progress',
      'A request with this Idempotency-Key is still being processed',
    ),
  insufficientPoints: () =>
    new ApiException(409, 'insufficient_points', 'Not enough points on the account'),
  outOfStock: () => new ApiException(409, 'out_of_stock', 'Reward is out of stock'),
  rewardUnavailable: () =>
    new ApiException(409, 'reward_unavailable', 'Reward is not available for redemption'),
  invalidState: (message: string) => new ApiException(409, 'invalid_state', message),
  selfTransfer: () => new ApiException(422, 'self_transfer', 'Cannot transfer points to yourself'),
  receiverUnavailable: () =>
    new ApiException(409, 'receiver_unavailable', 'Receiver account is unavailable'),
  dailyCapExceeded: (cap: number) =>
    new ApiException(422, 'daily_cap_exceeded', `Daily earn limit of ${cap} points exceeded`),
  staleTimestamp: () =>
    new ApiException(401, 'stale_timestamp', 'X-Timestamp is outside the allowed window'),
};
