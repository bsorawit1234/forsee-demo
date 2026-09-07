import { describe, expect, it } from 'vitest';
import { getNextJobStage, statusForStage } from './booking-workflow.js';

describe('booking workflow', () => {
  it('advances field stages in order', () => {
    expect(getNextJobStage('SCHEDULED')).toBe('EN_ROUTE');
    expect(getNextJobStage('IN_SERVICE')).toBe('COMPLETED');
    expect(getNextJobStage('COMPLETED')).toBe('COMPLETED');
  });

  it('does not confirm a pending booking when a stage is evaluated', () => {
    expect(statusForStage('PENDING_CONFIRMATION', 'EN_ROUTE')).toBe('PENDING_CONFIRMATION');
    expect(statusForStage('CONFIRMED', 'EN_ROUTE')).toBe('CONFIRMED');
  });
});
