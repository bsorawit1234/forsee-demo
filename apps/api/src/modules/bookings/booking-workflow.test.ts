import { describe, expect, it } from 'vitest';
import { getNextJobStage, statusForStage } from './booking-workflow.js';

describe('booking workflow', () => {
  it('advances field stages in order', () => {
    expect(getNextJobStage('SCHEDULED')).toBe('EN_ROUTE');
    expect(getNextJobStage('IN_SERVICE')).toBe('COMPLETED');
    expect(getNextJobStage('COMPLETED')).toBe('COMPLETED');
  });

  it('confirms a pending booking when work starts', () => {
    expect(statusForStage('PENDING_CONFIRMATION', 'EN_ROUTE')).toBe('CONFIRMED');
    expect(statusForStage('CONFIRMED', 'EN_ROUTE')).toBe('CONFIRMED');
  });
});
