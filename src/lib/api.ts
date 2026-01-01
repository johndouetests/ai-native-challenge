import type { Ticket } from './types'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public current?: Ticket,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

/** Network failures and 5xx responses. */
export function isTransientError(err: unknown): boolean {
  if (err instanceof ApiError) return err.status >= 500 || err.status === 0
  return !isAbortError(err)
}

type Query = Record<string, string | number | undefined | null>

export function buildQuery(params: Query): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

export async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal; query?: Query } = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}${init.query ? buildQuery(init.query) : ''}`, {
      method: init.method ?? 'GET',
      headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    })
  } catch (err) {
    if (isAbortError(err)) throw err
    throw new ApiError(0, 'network_error', 'Network request failed')
  }
  if (res.status === 204) return undefined as T
  let payload: unknown = undefined
  try {
    payload = await res.json()
  } catch (err) {
    if (isAbortError(err)) throw err
  }
  if (!res.ok) {
    const error = (payload as { error?: { code?: string; message?: string; current?: Ticket } } | undefined)?.error
    throw new ApiError(res.status, error?.code ?? 'http_error', error?.message ?? res.statusText, error?.current)
  }
  return payload as T
}
