import {
  splitStoryIntoSegments,
  FIRST_SEGMENT_MAX_CHARACTERS,
  MAX_STREAM_SEGMENT_CHARACTERS,
} from '../story-segments';

it('groups complete sentences without exceeding 1800 characters', () => {
  const sentences = Array.from({ length: 150 }, (_, index) => `Sentence ${index + 1}.`);
  const segments = splitStoryIntoSegments(sentences.join(' '));

  expect(segments.length).toBeGreaterThan(1);
  expect(segments[0].length).toBeLessThanOrEqual(FIRST_SEGMENT_MAX_CHARACTERS);
  expect(segments.slice(1).every((segment) => segment.length <= MAX_STREAM_SEGMENT_CHARACTERS)).toBe(true);
  expect(segments.every((segment) => /[.!?]["')\]]?$/.test(segment))).toBe(true);
  expect(segments.join(' ')).toBe(sentences.join(' '));
});

it('caps the first segment at the small-first limit on a sentence boundary', () => {
  const sentences = Array.from({ length: 100 }, (_, index) => `Sentence ${index + 1} is here.`);
  const text = sentences.join(' ');
  const segments = splitStoryIntoSegments(text);

  expect(segments[0].length).toBeLessThanOrEqual(FIRST_SEGMENT_MAX_CHARACTERS);
  // packs sentences up to the cap instead of emitting a tiny first chunk
  expect(segments[0].length).toBeGreaterThan(FIRST_SEGMENT_MAX_CHARACTERS - 25);
  expect(/[.!?]["')\]]?$/.test(segments[0])).toBe(true);
  expect(segments.slice(1).every((segment) => segment.length <= MAX_STREAM_SEGMENT_CHARACTERS)).toBe(true);
  expect(segments.join(' ')).toBe(text);
});

it('keeps short stories as a single segment below the small-first limit', () => {
  const text = 'Once upon a time, the moonlit fox found her way home.';
  const segments = splitStoryIntoSegments(text);

  expect(segments).toEqual([text]);
});

it('preserves punctuation and avoids empty segments', () => {
  const text = 'Wait... Really?! \u201cYes,\u201d said Pip.  Then they rested.';
  const segments = splitStoryIntoSegments(text);

  expect(segments.every((segment) => segment.trim().length > 0)).toBe(true);
  expect(segments.join(' ')).toBe(text);
});

it('uses clause boundaries for a sentence longer than the small-first limit', () => {
  const clause = 'The sleepy bear remembered the moonlit path, ';
  const text = `${clause.repeat(60)}and finally found the warm cabin.`;
  const segments = splitStoryIntoSegments(text);

  expect(segments.length).toBeGreaterThan(1);
  expect(segments[0].length).toBeLessThanOrEqual(FIRST_SEGMENT_MAX_CHARACTERS);
  expect(segments.every((segment) => segment.length < 2000)).toBe(true);
  expect(segments.join(' ')).toBe(text);
});

it('hard-splits pathological text only below the streaming limit and always progresses', () => {
  const text = 'x'.repeat(5000);
  const segments = splitStoryIntoSegments(text);

  expect(segments[0].length).toBeLessThanOrEqual(FIRST_SEGMENT_MAX_CHARACTERS);
  expect(segments.every((segment) => segment.length <= MAX_STREAM_SEGMENT_CHARACTERS)).toBe(true);
  expect(segments.join('')).toBe(text);
  expect(segments.every(Boolean)).toBe(true);
});
