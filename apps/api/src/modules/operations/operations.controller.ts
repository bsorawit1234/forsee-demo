import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/request-user.js';
import { SessionGuard } from '../auth/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { BookingListQueryDto } from '../bookings/booking.dto.js';
import { BookingService } from '../bookings/booking.service.js';
import { PrismaService } from '../../database/prisma.service.js';

@ApiTags('operations')
@ApiCookieAuth('session')
@UseGuards(SessionGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'STAFF')
@Controller('ops')
export class OperationsController {
  constructor(private readonly bookings: BookingService, private readonly prisma: PrismaService) {}

  @Get('calendar/week')
  week(@Query() query: BookingListQueryDto) { return this.bookings.opsList(query); }

  @Get('calendar/day')
  day(@Query() query: BookingListQueryDto) { return this.bookings.opsList(query); }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) { return { user: request.user }; }

  @Get('vehicles')
  async vehicles() {
    const items = await this.prisma.vehicle.findMany({ where: { isActive: true }, include: { vehicleType: true, assignments: { where: { isCurrent: true } } }, orderBy: { displayName: 'asc' } });
    return { items: items.map((item) => ({ id: item.id, registrationNumber: item.registrationNumber, displayName: item.displayName, type: item.vehicleType.nameTh, status: item.status, bookingId: item.assignments[0]?.bookingId ?? null })) };
  }

  @Get('customers')
  async customers() {
    const items = await this.prisma.organization.findMany({ where: { type: 'CUSTOMER', status: 'ACTIVE' }, include: { _count: { select: { bookings: true } }, customerSites: { where: { isActive: true } } }, orderBy: { name: 'asc' } });
    return { items: items.map((item) => ({ id: item.id, name: item.name, bookingCount: item._count.bookings, siteCount: item.customerSites.length })) };
  }
}
