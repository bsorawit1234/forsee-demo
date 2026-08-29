import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedRequest } from '../../common/request-user.js';
import { SessionGuard } from '../auth/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AvailabilityQueryDto } from './catalog.dto.js';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('services')
  async services() {
    const items = await this.prisma.serviceType.findMany({ where: { isActive: true }, include: { requiredVehicleType: true }, orderBy: { nameTh: 'asc' } });
    return items.map((item) => ({ code: item.code, name: item.nameTh, description: item.descriptionTh, durationMinutes: item.defaultDurationMinutes, vehicleType: item.requiredVehicleType.nameTh }));
  }

  @Get('customer/sites')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('CUSTOMER')
  async sites(@Req() request: AuthenticatedRequest) {
    const items = await this.prisma.customerSite.findMany({ where: { customerOrganizationId: request.user.organizationId, isActive: true }, orderBy: { name: 'asc' } });
    return { items };
  }

  @Get('customer/availability')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('CUSTOMER')
  async availability(@Req() request: AuthenticatedRequest, @Query() query: AvailabilityQueryDto) {
    const service = await this.prisma.serviceType.findFirst({ where: { code: query.serviceCode, isActive: true }, include: { requiredVehicleType: true } });
    if (!service) throw new BadRequestException('ไม่พบบริการที่เลือก');
    if (query.customerSiteId) {
      const site = await this.prisma.customerSite.findFirst({ where: { id: query.customerSiteId, customerOrganizationId: request.user.organizationId, isActive: true } });
      if (!site) throw new BadRequestException('สถานที่นี้ไม่อยู่ในบริษัทของคุณ');
    }
    const dayStart = new Date(`${query.date}T00:00:00+07:00`);
    const dayEnd = new Date(`${query.date}T23:59:59+07:00`);
    const weekday = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', weekday: 'short' }).format(dayStart).replace(/^Sun$/, '0').replace(/^Mon$/, '1').replace(/^Tue$/, '2').replace(/^Wed$/, '3').replace(/^Thu$/, '4').replace(/^Fri$/, '5').replace(/^Sat$/, '6'));
    const [ruleCandidates, vehicles, bookings] = await Promise.all([
      this.prisma.capacityRule.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ serviceTypeId: service.id }, { serviceTypeId: null }] },
            { OR: [{ vehicleTypeId: service.requiredVehicleTypeId }, { vehicleTypeId: null }] },
            { OR: [{ dayOfWeek: weekday }, { dayOfWeek: null }] },
            { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: dayStart } }] },
            { OR: [{ effectiveTo: null }, { effectiveTo: { gte: dayEnd } }] },
          ],
        },
      }),
      this.prisma.vehicle.findMany({
        where: { vehicleTypeId: service.requiredVehicleTypeId, isActive: true, status: { notIn: ['INACTIVE', 'MAINTENANCE'] } },
        select: {
          id: true,
          maintenance: {
            where: { status: { not: 'CANCELLED' }, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
            select: { startsAt: true, endsAt: true },
          },
        },
      }),
      this.prisma.booking.findMany({
        where: {
          requestedStartAt: { lt: dayEnd },
          requestedEndAt: { gt: dayStart },
          bookingStatus: { notIn: ['CANCELLED', 'REJECTED'] },
          serviceType: { requiredVehicleTypeId: service.requiredVehicleTypeId },
        },
        select: { requestedStartAt: true, requestedEndAt: true },
      }),
    ]);
    const rule = ruleCandidates.sort((left, right) => {
      const specificity = (candidate: typeof left) => (candidate.serviceTypeId ? 4 : 0) + (candidate.vehicleTypeId ? 2 : 0) + (candidate.dayOfWeek === null ? 0 : 1);
      return specificity(right) - specificity(left) || right.maxConcurrent - left.maxConcurrent;
    })[0];
    const fleetSize = vehicles.length;
    const policyCapacity = rule?.maxConcurrent ?? fleetSize;
    const capacity = Math.max(0, Math.min(policyCapacity, fleetSize));
    const duration = service.defaultDurationMinutes;
    const slots = [];
    for (let minutes = 8 * 60; minutes + duration <= 18 * 60; minutes += 30) {
      const start = new Date(`${query.date}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00+07:00`);
      const end = new Date(start.getTime() + duration * 60_000);
      const used = bookings.filter((booking) => booking.requestedStartAt < end && booking.requestedEndAt > start).length;
      const maintenanceCount = vehicles.filter((vehicle) => vehicle.maintenance.some((window) => window.startsAt < end && window.endsAt > start)).length;
      const slotCapacity = Math.max(0, Math.min(policyCapacity, fleetSize - maintenanceCount));
      slots.push({ start: start.toISOString(), end: end.toISOString(), capacity: slotCapacity, available: used < slotCapacity, remaining: Math.max(slotCapacity - used, 0) });
    }
    return { date: query.date, serviceCode: service.code, vehicleType: service.requiredVehicleType.nameTh, fleetSize, capacity, slots };
  }

  @Post('customer/availability/query')
  @ApiBody({ type: AvailabilityQueryDto })
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('CUSTOMER')
  availabilityQuery(@Req() request: AuthenticatedRequest, @Body() query: AvailabilityQueryDto) {
    return this.availability(request, query);
  }
}
