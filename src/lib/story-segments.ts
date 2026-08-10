export const MAX_STREAM_SEGMENT_CHARACTERS = 1900;
export const FIRST_SEGMENT_MAX_CHARACTERS = 600;
export const MAX_STREAM_CHARACTERS = 2000;
export const FIRST_SEGMENT_MIN_CHARACTERS = 400;
export const PREFERRED_SEGMENT_MIN_CHARACTERS = 500;

const PARAGRAPH_END = /\n[\t ]*\n+/g;
const SENTENCE_END = /[.!?]+["”')\]]?(?=\s|$)/g;
const LINE_END = /\n+/g;
const CLAUSE_END = /[,;:](?=\s|$)/g;
const WORD_END = /\s+/g;
const BOUNDARY_PRIORITY = [PARAGRAPH_END, SENTENCE_END, LINE_END, CLAUSE_END, WORD_END];
const FIRST_SEGMENT_BOUNDARIES = [PARAGRAPH_END, SENTENCE_END, LINE_END, CLAUSE_END];
const ATTRIBUTION_START =
  /^(?:[A-Z][\p{L}'’-]*(?:\s+[A-Z][\p{L}'’-]*)?\s+)?(?:said|asked|answered|replied|whispered|murmured|called|added|explained|continued)\b/iu;

function isInsideToken(text: string, index: number, open: string, close: string): boolean {
  const before = text.slice(0, index);
  return before.lastIndexOf(open) > before.lastIndexOf(close);
}

function isInsideQuotation(text: string, index: number): boolean {
  const before = text.slice(0, index);
  let straightQuotes = 0;
  for (const character of before) {
    if (character === '"') straightQuotes += 1;
  }

  return straightQuotes % 2 === 1 || before.lastIndexOf('“') > before.lastIndexOf('”');
}

function separatesDialogueAttribution(text: string, index: number): boolean {
  const before = text.slice(0, index).trimEnd();
  if (!/["”]\s*$/.test(before)) return false;
  return ATTRIBUTION_START.test(text.slice(index).trimStart());
}

function isSafeBoundary(text: string, index: number): boolean {
  return (
    !isInsideQuotation(text, index) &&
    !isInsideToken(text, index, '<', '>') &&
    !isInsideToken(text, index, '[', ']') &&
    !separatesDialogueAttribution(text, index)
  );
}

function findBoundary(
  text: string,
  regexes: RegExp[],
  minimum: number,
  maximum: number,
): number {
  for (const regex of regexes) {
    let last = -1;
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const end = match.index + match[0].length;
      if (end > maximum) break;
      if (end >= minimum && isSafeBoundary(text, end)) last = end;
    }

    if (last > 0) return last;
  }

  return -1;
}

function preferredMaximum(remainingLength: number, cap: number, preferredTail: number): number {
  if (remainingLength <= cap + preferredTail) {
    return Math.max(1, remainingLength - preferredTail);
  }
  return cap;
}

export function splitStoryIntoSegments(text: string): string[] {
  const story = text.trim();
  if (!story) {
    throw new Error('splitStoryIntoSegments requires non-empty text');
  }

  const segments: string[] = [];
  let offset = 0;
  let isFirstSegment = true;

  while (story.length - offset > MAX_STREAM_SEGMENT_CHARACTERS) {
    const remaining = story.slice(offset);
    const preferredMinimum = isFirstSegment
      ? FIRST_SEGMENT_MIN_CHARACTERS
      : PREFERRED_SEGMENT_MIN_CHARACTERS;
    const normalMaximum = preferredMaximum(
      remaining.length,
      MAX_STREAM_SEGMENT_CHARACTERS,
      PREFERRED_SEGMENT_MIN_CHARACTERS,
    );

    let boundary = -1;
    if (isFirstSegment) {
      boundary = findBoundary(
        remaining,
        FIRST_SEGMENT_BOUNDARIES,
        FIRST_SEGMENT_MIN_CHARACTERS,
        FIRST_SEGMENT_MAX_CHARACTERS,
      );
    }

    if (boundary < 0) {
      boundary = findBoundary(
        remaining,
        BOUNDARY_PRIORITY,
        preferredMinimum,
        normalMaximum,
      );
    }

    if (boundary < 0) {
      boundary = findBoundary(remaining, BOUNDARY_PRIORITY, 1, normalMaximum);
    }

    if (boundary < 0) {
      boundary = normalMaximum;
    }

    segments.push(remaining.slice(0, boundary));
    offset += boundary;
    isFirstSegment = false;
  }

  const finalSegment = story.slice(offset);
  if (finalSegment) segments.push(finalSegment);
  return segments;
}
