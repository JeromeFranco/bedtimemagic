import { createOperationId, emitObservabilityEvent, startDuration } from '../observability';

describe('observability', () => {
  afterEach(() => jest.restoreAllMocks());
  it('emits a one-line, allowlisted JSON record', () => {
    const sink = jest.spyOn(console, 'info').mockImplementation();
    emitObservabilityEvent('supabase.function.succeeded', { operationId: 'op_safe', functionName: 'generate-story', durationMs: 1.4, unsafe: 'secret' } as never);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sink.mock.calls[0][0])).toEqual(expect.objectContaining({ event: 'supabase.function.succeeded', durationMs: 1, functionName: 'generate-story' }));
    expect(sink.mock.calls[0][0]).not.toContain('secret');
  });
  it('creates bounded opaque identifiers and normalizes durations', () => {
    const id = createOperationId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(95);
    expect(startDuration()()).toBe(0);
  });
  it('swallows a throwing sink', () => {
    jest.spyOn(console, 'debug').mockImplementation(() => { throw new Error('sink'); });
    expect(() => emitObservabilityEvent('supabase.function.started', { operationId: 'op_safe', functionName: 'generate-story' })).not.toThrow();
  });
});
