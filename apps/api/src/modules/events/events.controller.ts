import { Controller, Req, Sse, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { filter, map } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../../common/request-user.js';
import { EventBus } from './event-bus.js';
import { SessionGuard } from '../auth/session.guard.js';

@ApiTags('events')
@Controller()
export class EventsController {
  constructor(private readonly bus: EventBus) {}

  @Sse('events')
  @ApiCookieAuth('session')
  @UseGuards(SessionGuard)
  events(@Req() request: AuthenticatedRequest) {
    return this.bus.events.pipe(
      filter((event) => request.user.organizationType !== 'CUSTOMER' || event.customerOrganizationId === request.user.organizationId),
      map((event) => ({ type: event.type, data: JSON.stringify(event) })),
    );
  }
}
