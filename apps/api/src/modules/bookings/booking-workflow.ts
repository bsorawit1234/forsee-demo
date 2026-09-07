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
  // Booking confirmation is an operations action. Advancing a field stage must
  // never silently change the booking's approval state.
  void stage;
  return currentStatus;
}
import type { BookingStatus } from '@prisma/client';
