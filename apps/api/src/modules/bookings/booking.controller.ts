import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/request-user.js';
import { SessionGuard } from '../auth/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AssignBookingDto, BookingListQueryDto, CreateBookingDto } from './booking.dto.js';
import { BookingService } from './booking.service.js';

@ApiTags('bookings')
@ApiCookieAuth('session')
@UseGuards(SessionGuard, RolesGuard)
@Controller()
export class BookingController {
  constructor(private readonly bookings: BookingService) {}

  @Get('customer/bookings')
  @Roles('CUSTOMER')
  customerList(@Req() req: AuthenticatedRequest, @Query() query: BookingListQueryDto) { return this.bookings.customerList(req.user, query); }

  @Post('customer/bookings')
  @ApiBody({ type: CreateBookingDto })
  @Roles('CUSTOMER')
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBookingDto) { return this.bookings.createCustomerBooking(req.user, dto); }

  @Get('customer/bookings/:id')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @Roles('CUSTOMER')
  customerOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.bookings.findOne(id, req.user); }

  @Get('ops/bookings')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  opsList(@Query() query: BookingListQueryDto) { return this.bookings.opsList(query); }

  @Get('ops/bookings/:id')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @Roles('OWNER', 'ADMIN', 'STAFF')
  opsOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.bookings.findOne(id, req.user); }

  @Get('ops/dashboard')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  dashboard() { return this.bookings.dashboard(); }

  @Post('ops/bookings/:id/confirm')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @Roles('OWNER', 'ADMIN', 'STAFF')
  confirm(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.bookings.confirm(id, req.user); }

  @Post('ops/bookings/:id/assign')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: AssignBookingDto })
  @Roles('OWNER', 'ADMIN', 'STAFF')
  assign(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: AssignBookingDto) { return this.bookings.assign(id, dto, req.user); }

  @Post('ops/bookings/:id/advance')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @Roles('OWNER', 'ADMIN', 'STAFF')
  advance(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.bookings.advance(id, req.user); }
}
