import type { FunctionInvokeOptions } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { categorizeError, createOperationId, emitObservabilityEvent, startDuration } from './observability';
import type { Story } from '@/types';

export type InstrumentedFunctionName = 'generate-story' | 'generate-cover-image' | 'generate-inworld-token';
export type InstrumentedFunctionResultMap = {
  'generate-story': Story;
  'generate-cover-image': { coverImageUrl: string };
  'generate-inworld-token': { token: string; expirationTime?: string; type?: string };
};
export async function invokeEdgeFunction<Name extends InstrumentedFunctionName>(
  functionName: Name,
  options?: FunctionInvokeOptions,
): Promise<InstrumentedFunctionResultMap[Name]> {
  const operationId = createOperationId();
  const duration = startDuration();
  emitObservabilityEvent('supabase.function.started', { operationId, functionName });
  // TODO: Revisit server correlation when withSupabase supports adding a custom
  // CORS allowlisted header without replacing its framework-managed preflight handling.
  const invocationOptions = options;
  let emittedTerminal = false;
  const emitTerminal = (event: 'supabase.function.cancelled' | 'supabase.function.succeeded' | 'supabase.function.failed', error?: unknown) => {
    if (emittedTerminal) return;
    emittedTerminal = true;
    const elapsed = duration();
    if (event === 'supabase.function.failed') {
      emitObservabilityEvent(event, { operationId, functionName, durationMs: elapsed, ...categorizeError(error) });
    } else {
      emitObservabilityEvent(event, { operationId, functionName, durationMs: elapsed });
    }
  };
  try {
    const result = await supabase.functions.invoke(functionName, invocationOptions);
    if (options?.signal?.aborted) {
      emitTerminal('supabase.function.cancelled');
    } else if (!result.error) {
      emitTerminal('supabase.function.succeeded');
    } else {
      emitTerminal('supabase.function.failed', result.error);
      throw result.error;
    }
    if (result.error) throw result.error;
    return result.data as InstrumentedFunctionResultMap[Name];
  } catch (error) {
    if (options?.signal?.aborted) {
      emitTerminal('supabase.function.cancelled');
    } else {
      emitTerminal('supabase.function.failed', error);
    }
    throw error;
  }
}
