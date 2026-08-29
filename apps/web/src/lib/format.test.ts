import { describe, expect, it } from 'vitest';
import { formatThaiDate } from './format';

describe('formatThaiDate', () => {
  it('formats booking dates for Thai users', () => {
    expect(formatThaiDate('2026-09-01')).toContain('ก.ย.');
    expect(formatThaiDate('2026-09-01')).toContain('2569');
  });
});
