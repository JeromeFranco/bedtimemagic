import { formatDuration } from '../utils';

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats exact minutes', () => {
    expect(formatDuration(120)).toBe('2:00');
  });

  it('formats minutes with remaining seconds', () => {
    expect(formatDuration(150)).toBe('2:30');
  });

  it('pads single digit seconds', () => {
    expect(formatDuration(61)).toBe('1:01');
  });
});
