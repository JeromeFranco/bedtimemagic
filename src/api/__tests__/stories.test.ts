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

import { generateCoverImage, generateStory } from '../stories';
import { supabase } from '@/lib/supabase';

describe('generateCoverImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls generate-cover-image edge function with correct params', async () => {
    jest.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { coverImageUrl: 'https://example.com/cover.png' },
      error: null,
    });

    const result = await generateCoverImage('story-123', 'Test Story');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-cover-image', expect.objectContaining({
      body: { storyId: 'story-123', title: 'Test Story' },
    }));
    expect(result).toEqual({ coverImageUrl: 'https://example.com/cover.png' });
  });

  it('throws on error', async () => {
    jest.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error('Failed'),
    });

    await expect(generateCoverImage('story-123', 'Test')).rejects.toThrow('Failed');
  });
});

describe('generateStory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the captured request body and optional abort signal to the edge function', async () => {
    const signal = new AbortController().signal;
    const story = { id: 'story-123' };
    jest.mocked(supabase.functions.invoke).mockResolvedValue({ data: story, error: null });

    await expect(
      generateStory(
        'child-123',
        'barnaby',
        'Mia',
        'preschool',
        'bedtime',
        'refusing_teeth',
        signal,
      ),
    ).resolves.toEqual(story);

    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-story', expect.objectContaining({
      signal,
      body: {
        childId: 'child-123',
        protagonistId: 'barnaby',
        childNickname: 'Mia',
        developmentalStage: 'preschool',
        tier1Challenge: 'bedtime',
        tier2Trigger: 'refusing_teeth',
      },
    }));
  });
});
