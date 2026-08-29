export type JobStageValue = 'SCHEDULED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';

const nextStage: Record<JobStageValue, JobStageValue> = {
  SCHEDULED: 'EN_ROUTE',
  EN_ROUTE: 'ARRIVED',
  ARRIVED: 'IN_SERVICE',
  IN_SERVICE: 'COMPLETED',
  COMPLETED: 'COMPLETED',
};

export function getNextJobStage(stage: JobStageValue) {
  return nextStage[stage];
}

export function statusForStage(currentStatus: BookingStatus, stage: JobStageValue): BookingStatus {
  return currentStatus === 'PENDING_CONFIRMATION' && stage !== 'SCHEDULED' ? 'CONFIRMED' : currentStatus;
}
import type { BookingStatus } from '@prisma/client';
