export const MAX_STREAM_SEGMENT_CHARACTERS = 1800;
export const FIRST_SEGMENT_MAX_CHARACTERS = 600;
export const MAX_STREAM_CHARACTERS = 2000;

const SENTENCE_END = /([.!?]+["')\]]?)\s+/g;
const CLAUSE_END = /([,;:]\s+|(?:[.!?]+["')\]]?\s+))/g;

function findLastBoundary(text: string, regex: RegExp, max: number): number {
  let last = -1;
  let match: RegExpExecArray | null;
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const end = match.index + match[0].length;
    if (end > max) break;
    last = end;
  }
  return last;
}

function hardSplit(text: string, max: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + max));
    i += max;
  }
  return chunks;
}

export function splitStoryIntoSegments(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('splitStoryIntoSegments requires non-empty text');
  }

  const segments: string[] = [];
  let remaining = trimmed;
  let isFirstSegment = true;

  while (true) {
    // smaller cap for the first segment so playback can start sooner
    const cap = isFirstSegment ? FIRST_SEGMENT_MAX_CHARACTERS : MAX_STREAM_SEGMENT_CHARACTERS;
    if (remaining.length <= cap) break;

    const sentenceEnd = findLastBoundary(remaining, SENTENCE_END, cap);

    if (sentenceEnd > 0) {
      segments.push(remaining.slice(0, sentenceEnd).trimEnd());
      remaining = remaining.slice(sentenceEnd).trimStart();
      isFirstSegment = false;
      continue;
    }

    const clauseEnd = findLastBoundary(remaining, CLAUSE_END, cap);

    if (clauseEnd > 0) {
      segments.push(remaining.slice(0, clauseEnd).trimEnd());
      remaining = remaining.slice(clauseEnd).trimStart();
      isFirstSegment = false;
      continue;
    }

    const chunks = hardSplit(remaining, cap);
    for (let i = 0; i < chunks.length - 1; i++) {
      segments.push(chunks[i]);
    }
    remaining = chunks[chunks.length - 1];
    isFirstSegment = false;
  }

  if (remaining.length > 0) {
    segments.push(remaining);
  }

  return segments;
}
