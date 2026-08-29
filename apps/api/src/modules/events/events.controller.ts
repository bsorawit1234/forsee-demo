import { Controller, Sse, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { map } from 'rxjs/operators';
import { EventBus } from './event-bus.js';
import { SessionGuard } from '../auth/session.guard.js';

@ApiTags('events')
@Controller()
export class EventsController {
  constructor(private readonly bus: EventBus) {}

  @Sse('events')
  @ApiCookieAuth('session')
  @UseGuards(SessionGuard)
  events() {
    return this.bus.events.pipe(map((event) => ({ type: event.type, data: JSON.stringify(event) })));
  }
}
