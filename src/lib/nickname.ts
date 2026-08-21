export const NICKNAME_MAX_LENGTH = 24;

export function normalizeNickname(value: string): string {
  return value.normalize('NFC').trim().replace(/[\t ]+/gu, ' ');
}

export function getNicknameValidationError(value: string): string | null {
  if (/[\r\n\p{Cc}]/u.test(value)) {
    return 'Use letters, numbers, spaces, apostrophes, or hyphens.';
  }

  const normalized = normalizeNickname(value);
  const length = Array.from(normalized).length;

  if (length === 0) return 'Enter a bedtime nickname.';
  if (length > NICKNAME_MAX_LENGTH) {
    return `Use ${NICKNAME_MAX_LENGTH} characters or fewer.`;
  }
  if (!/[\p{L}\p{N}]/u.test(normalized)) {
    return 'Include at least one letter or number.';
  }
  if (!/^[\p{L}\p{N} '\u2018\u2019-]+$/u.test(normalized)) {
    return 'Use letters, numbers, spaces, apostrophes, or hyphens.';
  }

  return null;
}
