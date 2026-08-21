import {
  getNicknameValidationError,
  NICKNAME_MAX_LENGTH,
  normalizeNickname,
} from '@/lib/nickname';

describe('nickname validation', () => {
  it('normalizes Unicode and whitespace without counting UTF-16 units', () => {
    expect(normalizeNickname('  Cafe\u0301\t  Bear  ')).toBe('Café Bear');
    expect(getNicknameValidationError('É'.repeat(NICKNAME_MAX_LENGTH))).toBeNull();
  });

  it('accepts the one and 24 code-point boundaries', () => {
    expect(getNicknameValidationError('A')).toBeNull();
    expect(getNicknameValidationError('A'.repeat(24))).toBeNull();
    expect(getNicknameValidationError('A'.repeat(25))).toBe(
      'Use 24 characters or fewer.',
    );
  });

  it('allows supported punctuation and requires a letter or number', () => {
    expect(getNicknameValidationError("D'Arcy-Rose 2")).toBeNull();
    expect(getNicknameValidationError('Luna’s')).toBeNull();
    expect(getNicknameValidationError("---''")).toBe(
      'Include at least one letter or number.',
    );
  });

  it('rejects emoji, unsupported punctuation, controls, and line breaks', () => {
    expect(getNicknameValidationError('Rocket 🚀')).not.toBeNull();
    expect(getNicknameValidationError('Buddy!')).not.toBeNull();
    expect(getNicknameValidationError('Bed\u0000time')).not.toBeNull();
    expect(getNicknameValidationError('Bed\ntime')).not.toBeNull();
  });
});
