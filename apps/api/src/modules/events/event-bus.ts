import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export type OperationsEvent = {
  type: string;
  bookingId?: string;
  payload?: Record<string, unknown>;
};

@Injectable()
export class EventBus {
  readonly events = new Subject<OperationsEvent>();

  publish(event: OperationsEvent) {
    this.events.next(event);
  }
}
