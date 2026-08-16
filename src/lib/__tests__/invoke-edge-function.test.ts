jest.mock('../supabase', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
import { supabase } from '../supabase';
import { invokeEdgeFunction } from '../invoke-edge-function';

describe('invokeEdgeFunction', () => {
  afterEach(() => jest.restoreAllMocks());
  it('preserves options and returns the original data reference', async () => {
    const data = { coverImageUrl: 'safe-url' };
    jest.mocked(supabase.functions.invoke).mockResolvedValue({ data, error: null } as never);
    const options = { body: { x: 1 }, headers: { 'X-Test': 'yes' } };
    await expect(invokeEdgeFunction('generate-cover-image', options)).resolves.toBe(data);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-cover-image', options);
  });
  it('preserves error identity', async () => {
    const error = new Error('private');
    jest.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error } as never);
    await expect(invokeEdgeFunction('generate-story')).rejects.toBe(error);
  });
});
