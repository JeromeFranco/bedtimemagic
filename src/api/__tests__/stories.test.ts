jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

import { generateCoverImage } from '../stories';
import { supabase } from '@/lib/supabase';

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe('generateCoverImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls generate-cover-image edge function with correct params', async () => {
    mockedSupabase.functions.invoke.mockResolvedValue({
      data: { coverImageUrl: 'https://example.com/cover.png' },
      error: null,
    });

    const result = await generateCoverImage('story-123', 'Test Story');

    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith('generate-cover-image', {
      body: { storyId: 'story-123', title: 'Test Story' },
    });
    expect(result).toEqual({ coverImageUrl: 'https://example.com/cover.png' });
  });

  it('throws on error', async () => {
    mockedSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: new Error('Failed'),
    });

    await expect(generateCoverImage('story-123', 'Test')).rejects.toThrow('Failed');
  });
});
