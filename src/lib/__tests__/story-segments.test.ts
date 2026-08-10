import {
  FIRST_SEGMENT_MAX_CHARACTERS,
  MAX_STREAM_CHARACTERS,
  MAX_STREAM_SEGMENT_CHARACTERS,
  PREFERRED_SEGMENT_MIN_CHARACTERS,
  splitStoryIntoSegments,
} from '../story-segments';

function expectValidReconstruction(text: string, segments: string[]) {
  expect(segments.join('')).toBe(text.trim());
  expect(segments.every((segment) => segment.length > 0)).toBe(true);
  expect(segments.every((segment) => segment.length <= MAX_STREAM_SEGMENT_CHARACTERS)).toBe(true);
  expect(segments.every((segment) => segment.length < MAX_STREAM_CHARACTERS)).toBe(true);
}

it('prefers paragraph boundaries and reconstructs every character', () => {
  const paragraph = (label: string) => `${label} ${'calm words '.repeat(48).trim()}.`;
  const text = [paragraph('First'), paragraph('Second'), paragraph('Third'), paragraph('Fourth')].join(
    '\n\n',
  );
  const segments = splitStoryIntoSegments(text);

  expect(segments.length).toBeGreaterThan(1);
  expect(segments[0]).toMatch(/\n\n$/);
  expectValidReconstruction(text, segments);
});

it('uses the startup cap when a natural first boundary exists', () => {
  const text = `${'Opening words '.repeat(38).trim()}. ${'Later sentence. '.repeat(160)}`;
  const segments = splitStoryIntoSegments(text);

  expect(segments[0].length).toBeLessThanOrEqual(FIRST_SEGMENT_MAX_CHARACTERS);
  expect(segments[0]).toMatch(/\.$/);
  expectValidReconstruction(text, segments);
});

it('lets the first segment grow when no safe early boundary exists', () => {
  const longOpening = `${'unbroken '.repeat(130).trim()}. `;
  const text = longOpening + 'A calm ending. '.repeat(100);
  const segments = splitStoryIntoSegments(text);

  expect(segments[0].length).toBeGreaterThan(FIRST_SEGMENT_MAX_CHARACTERS);
  expect(segments[0].length).toBeLessThanOrEqual(MAX_STREAM_SEGMENT_CHARACTERS);
  expect(segments[0]).toMatch(/\.$/);
  expectValidReconstruction(text, segments);
});

it('does not split inside dialogue or between dialogue and its attribution', () => {
  const dialogue = `“${'I can wait calmly '.repeat(42).trim()},” Barnaby said. `;
  const text = dialogue + 'The room grew quiet. '.repeat(130);
  const segments = splitStoryIntoSegments(text);

  expect(segments[0]).toContain('Barnaby said.');
  expect(segments[0].match(/“/g)).toHaveLength(1);
  expect(segments[0].match(/”/g)).toHaveLength(1);
  expectValidReconstruction(text, segments);
});

it('falls back from sentence to clause and then word boundaries', () => {
  const clauseText = `${'softly '.repeat(90)}, ${'gently '.repeat(240)}, ${'quietly '.repeat(80)}`;
  const clauseSegments = splitStoryIntoSegments(clauseText);
  expect(clauseSegments[0]).toMatch(/,$/);
  expectValidReconstruction(clauseText, clauseSegments);

  const wordText = 'bedtime '.repeat(520).trim();
  const wordSegments = splitStoryIntoSegments(wordText);
  expect(wordSegments[0]).toMatch(/\s$/);
  expectValidReconstruction(wordText, wordSegments);
});

it('uses line breaks after sentence boundaries are unavailable', () => {
  const line = 'low gentle humming '.repeat(38).trim();
  const text = `${line}\n${line}\n${line}\n${line}`;
  const segments = splitStoryIntoSegments(text);

  expect(segments[0]).toMatch(/\n$/);
  expectValidReconstruction(text, segments);
});

it('hard-splits pathological input without empty or oversized segments', () => {
  const text = 'x'.repeat(MAX_STREAM_SEGMENT_CHARACTERS * 2 + 173);
  const segments = splitStoryIntoSegments(text);

  expect(segments).toHaveLength(3);
  expect(segments.slice(0, -1).every((segment) => segment.length >= PREFERRED_SEGMENT_MIN_CHARACTERS)).toBe(
    true,
  );
  expectValidReconstruction(text, segments);
});

it('does not split inside SSML-like or bracketed tokens', () => {
  const prefix = 'calm '.repeat(100);
  const token = `<voice mood="${'gentle'.repeat(80)}">[pause ${'slow'.repeat(50)}]</voice>`;
  const text = `${prefix}${token} ${'sleepy words. '.repeat(180)}`;
  const segments = splitStoryIntoSegments(text);

  expect(segments.every((segment) => {
    const opens = (segment.match(/</g) ?? []).length;
    const closes = (segment.match(/>/g) ?? []).length;
    return opens === closes;
  })).toBe(true);
  expectValidReconstruction(text, segments);
});

it('keeps a short story in one segment and rejects blank input', () => {
  expect(splitStoryIntoSegments('A short and sleepy story.')).toEqual(['A short and sleepy story.']);
  expect(() => splitStoryIntoSegments('   ')).toThrow('requires non-empty text');
});
