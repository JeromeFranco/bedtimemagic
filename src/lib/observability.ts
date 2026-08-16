import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { ApiError, NetworkError } from '@inworld/tts';

export type ObservabilityErrorKind =
  | 'http'
  | 'relay'
  | 'network'
  | 'auth'
  | 'provider'
  | 'cache'
  | 'cancelled'
  | 'unknown';

type FunctionName = 'generate-story' | 'generate-cover-image' | 'generate-inworld-token';
type SegmentPayload = { segmentIndex: number; segmentCount?: number; attempt?: number; bytesWritten?: number; errorKind?: ObservabilityErrorKind };

export type ObservabilityEventMap = {
  'supabase.function.started': { functionName: FunctionName };
  'supabase.function.succeeded': { functionName: FunctionName; durationMs?: number };
  'supabase.function.failed': { functionName: FunctionName; durationMs?: number; errorKind: ObservabilityErrorKind; status?: number };
  'supabase.function.cancelled': { functionName: FunctionName; durationMs?: number };
  'tts.prefetch.started': { segmentCount: number };
  'tts.prefetch.succeeded': { segmentCount: number; durationMs?: number };
  'tts.prefetch.failed': { segmentCount: number; durationMs?: number; errorKind: ObservabilityErrorKind };
  'tts.prefetch.cancelled': { segmentCount: number; durationMs?: number };
  'tts.token.cache_hit': { cacheState: 'hit' };
  'tts.token.refresh_started': { cacheState: 'refresh' };
  'tts.token.refresh_succeeded': { cacheState: 'refresh'; durationMs?: number };
  'tts.token.refresh_failed': { cacheState: 'refresh'; durationMs?: number; errorKind: ObservabilityErrorKind };
  'tts.segment.cache_hit': SegmentPayload;
  'tts.segment.deduplicated': SegmentPayload;
  'tts.segment.started': SegmentPayload;
  'tts.segment.retrying': SegmentPayload;
  'tts.segment.succeeded': SegmentPayload & { durationMs?: number; bytesWritten: number };
  'tts.segment.failed': SegmentPayload & { durationMs?: number; errorKind: ObservabilityErrorKind };
  'tts.segment.cancelled': SegmentPayload & { durationMs?: number };
};

export type ObservabilityEventName = keyof ObservabilityEventMap;
type Primitive = string | number | boolean;
type EventInput<Name extends ObservabilityEventName> = ObservabilityEventMap[Name] & {
  operationId: string;
  parentOperationId?: string;
};

const EVENT_LEVELS: Record<ObservabilityEventName, 'debug' | 'info' | 'warn' | 'error'> = {
  'supabase.function.started': 'debug', 'supabase.function.succeeded': 'info', 'supabase.function.failed': 'error', 'supabase.function.cancelled': 'warn',
  'tts.prefetch.started': 'debug', 'tts.prefetch.succeeded': 'info', 'tts.prefetch.failed': 'error', 'tts.prefetch.cancelled': 'warn',
  'tts.token.cache_hit': 'debug', 'tts.token.refresh_started': 'debug', 'tts.token.refresh_succeeded': 'info', 'tts.token.refresh_failed': 'error',
  'tts.segment.cache_hit': 'debug', 'tts.segment.deduplicated': 'debug', 'tts.segment.started': 'debug', 'tts.segment.retrying': 'warn', 'tts.segment.succeeded': 'info', 'tts.segment.failed': 'error', 'tts.segment.cancelled': 'warn',
};
const EVENT_FIELDS: Record<ObservabilityEventName, readonly string[]> = {
  'supabase.function.started': ['functionName'], 'supabase.function.succeeded': ['functionName', 'durationMs'], 'supabase.function.failed': ['functionName', 'durationMs', 'errorKind', 'status'], 'supabase.function.cancelled': ['functionName', 'durationMs'],
  'tts.prefetch.started': ['segmentCount'], 'tts.prefetch.succeeded': ['segmentCount', 'durationMs'], 'tts.prefetch.failed': ['segmentCount', 'durationMs', 'errorKind'], 'tts.prefetch.cancelled': ['segmentCount', 'durationMs'],
  'tts.token.cache_hit': ['cacheState'], 'tts.token.refresh_started': ['cacheState'], 'tts.token.refresh_succeeded': ['cacheState', 'durationMs'], 'tts.token.refresh_failed': ['cacheState', 'durationMs', 'errorKind'],
  'tts.segment.cache_hit': ['segmentIndex', 'segmentCount', 'attempt'], 'tts.segment.deduplicated': ['segmentIndex', 'segmentCount', 'attempt'], 'tts.segment.started': ['segmentIndex', 'segmentCount', 'attempt'], 'tts.segment.retrying': ['segmentIndex', 'segmentCount', 'attempt', 'errorKind'], 'tts.segment.succeeded': ['segmentIndex', 'segmentCount', 'attempt', 'durationMs', 'bytesWritten'], 'tts.segment.failed': ['segmentIndex', 'segmentCount', 'attempt', 'durationMs', 'errorKind'], 'tts.segment.cancelled': ['segmentIndex', 'segmentCount', 'attempt', 'durationMs'],
};
let operationCounter = 0;
export function createOperationId(): string {
  operationCounter = (operationCounter + 1) % 0x7fffffff;
  return `op_${Date.now().toString(36)}_${operationCounter.toString(36)}_${Math.random().toString(36).slice(2, 12)}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}
export function startDuration(): () => number | undefined {
  let start: number | undefined;
  try { start = Date.now(); } catch { return () => undefined; }
  return () => { try { const elapsed = Date.now() - start!; return Number.isFinite(elapsed) ? Math.max(0, Math.round(elapsed)) : undefined; } catch { return undefined; } };
}
function safePrimitive(value: unknown, key: string): Primitive | undefined {
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return key === 'durationMs' ? Math.max(0, Math.round(value)) : value;
  return undefined;
}
export function categorizeError(error: unknown, stage?: ObservabilityErrorKind): { errorKind: ObservabilityErrorKind; status?: number } {
  if (error instanceof FunctionsHttpError) return { errorKind: 'http', status: Number.isFinite(error.context.status) ? error.context.status : undefined };
  if (error instanceof FunctionsRelayError) return { errorKind: 'relay', status: Number.isFinite(error.context.status) ? error.context.status : undefined };
  if (error instanceof FunctionsFetchError || (typeof NetworkError === 'function' && error instanceof NetworkError)) return { errorKind: 'network' };
  if (typeof ApiError === 'function' && error instanceof ApiError) return { errorKind: 'provider' };
  return { errorKind: stage ?? 'unknown' };
}
export function emitObservabilityEvent<Name extends ObservabilityEventName>(event: Name, input: EventInput<Name>): void {
  if (!__DEV__) return;
  try {
    const record: Record<string, Primitive> = { timestamp: new Date().toISOString(), level: EVENT_LEVELS[event], event, operationId: input.operationId };
    if (input.parentOperationId) record.parentOperationId = input.parentOperationId;
    for (const key of EVENT_FIELDS[event]) { const value = safePrimitive((input as Record<string, unknown>)[key], key); if (value !== undefined) record[key] = value; }
    const line = JSON.stringify(record);
    console[EVENT_LEVELS[event]](line);
  } catch { /* diagnostics must never affect application behavior */ }
}
