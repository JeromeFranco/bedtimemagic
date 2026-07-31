import { splitStoryIntoSegments } from '../story-segments';

it('groups complete sentences without exceeding 1800 characters', () => {
  const sentences = Array.from({ length: 150 }, (_, index) => `Sentence ${index + 1}.`);
  const segments = splitStoryIntoSegments(sentences.join(' '));

  expect(segments.length).toBeGreaterThan(1);
  expect(segments.every((segment) => segment.length <= 1800)).toBe(true);
  expect(segments.every((segment) => /[.!?]["')\]]?$/.test(segment))).toBe(true);
  expect(segments.join(' ')).toBe(sentences.join(' '));
});

it('preserves punctuation and avoids empty segments', () => {
  const text = 'Wait... Really?! \u201cYes,\u201d said Pip.  Then they rested.';
  const segments = splitStoryIntoSegments(text);

  expect(segments.every((segment) => segment.trim().length > 0)).toBe(true);
  expect(segments.join(' ')).toBe(text);
});

it('uses clause boundaries for a sentence longer than 1800 characters', () => {
  const clause = 'The sleepy bear remembered the moonlit path, ';
  const text = `${clause.repeat(60)}and finally found the warm cabin.`;
  const segments = splitStoryIntoSegments(text);

  expect(segments.length).toBeGreaterThan(1);
  expect(segments.every((segment) => segment.length < 2000)).toBe(true);
  expect(segments.join(' ')).toBe(text);
});

it('hard-splits pathological text only below the streaming limit and always progresses', () => {
  const text = 'x'.repeat(5000);
  const segments = splitStoryIntoSegments(text);

  expect(segments.every((segment) => segment.length <= 1800)).toBe(true);
  expect(segments.join('')).toBe(text);
  expect(segments.every(Boolean)).toBe(true);
});
