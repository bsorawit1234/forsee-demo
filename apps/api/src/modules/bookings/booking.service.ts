import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { EventBus } from '../events/event-bus.js';
import type { SessionUser } from '../../common/request-user.js';
import type { AssignBookingDto, BookingListQueryDto, CreateBookingDto } from './booking.dto.js';
import { getNextJobStage, statusForStage } from './booking-workflow.js';

function atBangkok(date: string, time: string) { return new Date(`${date}T${time}:00+07:00`); }

function publicBooking(item: any) {
  const assignment = item.assignments?.find((entry: any) => entry.isCurrent);
  return {
    id: item.id,
    bookingNumber: item.bookingNumber,
    customer: item.customerOrganization?.name,
    service: item.serviceType?.nameTh,
    site: item.customerSite?.name,
    address: [item.customerSite?.district, item.customerSite?.province].filter(Boolean).join(', '),
    requestedStartAt: item.requestedStartAt,
    requestedEndAt: item.requestedEndAt,
    confirmedStartAt: item.confirmedStartAt,
    confirmedEndAt: item.confirmedEndAt,
    bookingStatus: item.bookingStatus,
    assignmentStatus: item.assignmentStatus,
    jobStage: item.jobStage,
    slaHealth: item.slaHealth,
    vehicle: assignment?.vehicle?.displayName ?? null,
    driverUserId: assignment?.driverUserId ?? null,
    updatedAt: item.updatedAt,
  };
}

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventBus, private readonly audit: AuditService) {}

  private readonly include = { customerOrganization: true, customerSite: true, serviceType: true, assignments: { where: { isCurrent: true }, include: { vehicle: true } } } as const;

  async customerList(user: SessionUser, query: BookingListQueryDto) {
    const where: any = { customerOrganizationId: user.organizationId };
    if (query.status) where.bookingStatus = query.status;
    if (query.from || query.to) where.requestedStartAt = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lt: new Date(query.to) } : {}) };
    const items = await this.prisma.booking.findMany({ where, include: this.include, orderBy: { requestedStartAt: 'desc' } });
    return { items: items.map(publicBooking), total: items.length };
  }

  async createCustomerBooking(user: SessionUser, dto: CreateBookingDto) {
    const [site, service] = await Promise.all([
      this.prisma.customerSite.findFirst({ where: { id: dto.customerSiteId, customerOrganizationId: user.organizationId, isActive: true } }),
      this.prisma.serviceType.findFirst({ where: { code: dto.serviceCode, isActive: true } }),
    ]);
    if (!site) throw new BadRequestException('สถานที่นี้ไม่อยู่ในบริษัทของคุณ');
    if (!service) throw new BadRequestException('ไม่พบบริการที่เลือก');
    const start = atBangkok(dto.requestedDate, dto.requestedStart);
    const end = atBangkok(dto.requestedDate, dto.requestedEnd);
    if (end <= start) throw new BadRequestException('ช่วงเวลาไม่ถูกต้อง');
    const number = `BK-${dto.requestedDate.replaceAll('-', '')}-${Math.floor(100 + Math.random() * 899)}`;
    const created = await this.prisma.booking.create({ data: { bookingNumber: number, customerOrganizationId: user.organizationId, customerSiteId: site.id, serviceTypeId: service.id, requestedStartAt: start, requestedEndAt: end, estimatedVolume: dto.estimatedVolume, customerNote: dto.customerNote, createdByUserId: user.id }, include: this.include });
    this.events.publish({ type: 'booking.created', bookingId: created.id, payload: { bookingNumber: created.bookingNumber } });
    return publicBooking(created);
  }

  async findOne(id: string, user: SessionUser) {
    const where: any = { id };
    if (user.organizationType === 'CUSTOMER') where.customerOrganizationId = user.organizationId;
    const item = await this.prisma.booking.findFirst({ where, include: { ...this.include, statusHistory: { orderBy: { occurredAt: 'asc' } }, jobEvents: { orderBy: { occurredAt: 'asc' } } } });
    if (!item) throw new NotFoundException('ไม่พบ Booking');
    return { ...publicBooking(item), history: item.statusHistory, events: item.jobEvents };
  }

  async opsList(query: BookingListQueryDto) {
    const where: any = {};
    if (query.status) where.bookingStatus = query.status;
    if (query.from || query.to) where.requestedStartAt = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lt: new Date(query.to) } : {}) };
    const items = await this.prisma.booking.findMany({ where, include: this.include, orderBy: { requestedStartAt: 'asc' } });
    return { items: items.map(publicBooking), total: items.length };
  }

  async dashboard() {
    const [total, pending, unassigned, inProgress, atRisk] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { bookingStatus: 'PENDING_CONFIRMATION' } }),
      this.prisma.booking.count({ where: { assignmentStatus: 'UNASSIGNED', bookingStatus: { not: 'CANCELLED' } } }),
      this.prisma.booking.count({ where: { jobStage: { in: ['EN_ROUTE', 'ARRIVED', 'IN_SERVICE'] } } }),
      this.prisma.booking.count({ where: { slaHealth: { in: ['AT_RISK', 'OVERDUE'] } } }),
    ]);
    return { total, pending, unassigned, inProgress, atRisk };
  }

  async confirm(id: string, user: SessionUser) {
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    if (current.bookingStatus === 'CANCELLED' || current.bookingStatus === 'REJECTED') throw new BadRequestException('Booking นี้ไม่สามารถยืนยันได้');
    if (current.bookingStatus === 'CONFIRMED') return this.findOne(id, user);
    const updated = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({ where: { id }, data: { bookingStatus: 'CONFIRMED', confirmedByUserId: user.id, confirmedStartAt: current.requestedStartAt, confirmedEndAt: current.requestedEndAt, version: { increment: 1 } }, include: this.include });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'BOOKING_STATUS', fromValue: current.bookingStatus, toValue: 'CONFIRMED', actorUserId: user.id } });
      return booking;
    });
    this.events.publish({ type: 'booking.confirmed', bookingId: id });
    this.audit.record({ actorUserId: user.id, organizationId: user.organizationId, action: 'booking.confirmed', entityType: 'booking', entityId: id, beforeJson: { bookingStatus: current.bookingStatus }, afterJson: { bookingStatus: updated.bookingStatus } });
    return publicBooking(updated);
  }

  async assign(id: string, dto: AssignBookingDto, user: SessionUser) {
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle || !vehicle.isActive || vehicle.status === 'MAINTENANCE') throw new BadRequestException('รถคันนี้ไม่พร้อมจัดงาน');
    const updated = await this.prisma.$transaction(async (tx) => {
      const conflict = await tx.bookingAssignment.findFirst({ where: { vehicleId: dto.vehicleId, isCurrent: true, bookingId: { not: id }, booking: { bookingStatus: { not: 'CANCELLED' }, requestedStartAt: { lt: current.requestedEndAt }, requestedEndAt: { gt: current.requestedStartAt } } } });
      if (conflict) throw new BadRequestException('รถคันนี้มีงานชนกับช่วงเวลาที่เลือก');
      await tx.bookingAssignment.updateMany({ where: { bookingId: id, isCurrent: true }, data: { isCurrent: false, unassignedAt: new Date() } });
      await tx.bookingAssignment.create({ data: { bookingId: id, vehicleId: dto.vehicleId, driverUserId: dto.driverUserId, assignedByUserId: user.id, reason: dto.reason } });
      await tx.booking.update({ where: { id }, data: { assignmentStatus: 'ASSIGNED', version: { increment: 1 } } });
      return tx.booking.findUniqueOrThrow({ where: { id }, include: this.include });
    });
    this.events.publish({ type: 'booking.assignment.changed', bookingId: id, payload: { vehicleId: vehicle.id } });
    this.audit.record({ actorUserId: user.id, organizationId: user.organizationId, action: 'booking.assigned', entityType: 'booking', entityId: id, afterJson: { vehicleId: vehicle.id } });
    return publicBooking(updated);
  }

  async advance(id: string, user: SessionUser) {
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    if (current.bookingStatus === 'CANCELLED' || current.jobStage === 'COMPLETED') throw new BadRequestException('Booking นี้จบขั้นตอนแล้ว');
    const jobStage = getNextJobStage(current.jobStage);
    const bookingStatus = statusForStage(current.bookingStatus, jobStage);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.booking.update({ where: { id }, data: { jobStage, bookingStatus, version: { increment: 1 } }, include: this.include });
      await tx.jobEvent.create({ data: { bookingId: id, eventType: jobStage, actorUserId: user.id } });
      return item;
    });
    this.events.publish({ type: 'job.stage.changed', bookingId: id, payload: { jobStage } });
    this.audit.record({ actorUserId: user.id, organizationId: user.organizationId, action: 'booking.stage.changed', entityType: 'booking', entityId: id, beforeJson: { jobStage: current.jobStage }, afterJson: { jobStage } });
    return publicBooking(updated);
  }
}
