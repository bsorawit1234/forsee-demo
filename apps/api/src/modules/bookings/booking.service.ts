import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { EventBus } from '../events/event-bus.js';
import type { SessionUser } from '../../common/request-user.js';
import type { AssignBookingDto, BookingListQueryDto, CreateBookingDto } from './booking.dto.js';
import { getNextJobStage } from './booking-workflow.js';

function atBangkok(date: string, time: string) { return new Date(`${date}T${time}:00+07:00`); }

function validDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return false;
  const value = atBangkok(date, time);
  return !Number.isNaN(value.getTime()) && /^\d{2}:\d{2}$/.test(time) && Number(time.slice(0, 2)) < 24 && Number(time.slice(3, 5)) < 60;
}

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
    vehicleId: assignment?.vehicle?.id ?? null,
    vehicleRegistrationNumber: assignment?.vehicle?.registrationNumber ?? null,
    vehicleType: assignment?.vehicle?.vehicleType?.nameTh ?? null,
    driverUserId: assignment?.driverUserId ?? null,
    customerSiteId: item.customerSiteId,
    serviceCode: item.serviceType?.code,
    requiredVehicleTypeId: item.serviceType?.requiredVehicleTypeId,
    customerNote: item.customerNote,
    estimatedVolume: item.estimatedVolume,
    volumeUnit: item.volumeUnit,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventBus, private readonly audit: AuditService) {}

  private readonly include = { customerOrganization: true, customerSite: true, serviceType: true, assignments: { where: { isCurrent: true }, include: { vehicle: { include: { vehicleType: true } } } } } as const;

  private async assertCapacity(tx: Prisma.TransactionClient, serviceTypeId: string, vehicleTypeId: string, start: Date, end: Date) {
    const weekday = (start.getUTCDay() + 1) % 7;
    const [rules, fleetSize, maintenanceCount, overlapping] = await Promise.all([
      tx.capacityRule.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ serviceTypeId }, { serviceTypeId: null }] },
            { OR: [{ vehicleTypeId }, { vehicleTypeId: null }] },
            { OR: [{ dayOfWeek: weekday }, { dayOfWeek: null }] },
            { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: start } }] },
            { OR: [{ effectiveTo: null }, { effectiveTo: { gte: end } }] },
          ],
        },
      }),
      tx.vehicle.count({ where: { vehicleTypeId, isActive: true, status: { notIn: ['INACTIVE', 'MAINTENANCE'] } } }),
      tx.vehicle.count({ where: { vehicleTypeId, isActive: true, status: { not: 'INACTIVE' }, maintenance: { some: { status: { not: 'CANCELLED' }, startsAt: { lt: end }, endsAt: { gt: start } } } } }),
      tx.booking.count({ where: { bookingStatus: { notIn: ['CANCELLED', 'REJECTED'] }, requestedStartAt: { lt: end }, requestedEndAt: { gt: start }, serviceType: { requiredVehicleTypeId: vehicleTypeId } } }),
    ]);
    const minute = (value: string | null) => value ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) : null;
    const startMinute = (start.getUTCHours() + 7) * 60 + start.getUTCMinutes();
    const endMinute = (end.getUTCHours() + 7) * 60 + end.getUTCMinutes();
    const matchingRules = rules.filter((rule) => {
      const ruleStart = minute(rule.startTime);
      const ruleEnd = minute(rule.endTime);
      return (ruleStart === null || startMinute >= ruleStart) && (ruleEnd === null || endMinute <= ruleEnd);
    });
    const score = (rule: typeof rules[number]) => (rule.serviceTypeId ? 4 : 0) + (rule.vehicleTypeId ? 2 : 0) + (rule.dayOfWeek === null ? 0 : 1);
    const policyCapacity = matchingRules.sort((left, right) => score(right) - score(left))[0]?.maxConcurrent ?? fleetSize;
    const capacity = Math.max(0, Math.min(policyCapacity, fleetSize - maintenanceCount));
    if (capacity === 0 || overlapping >= capacity) throw new BadRequestException('ช่วงเวลานี้ไม่มีรถว่าง กรุณาเลือกเวลาอื่น');
  }

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
    if (!validDateTime(dto.requestedDate, dto.requestedStart) || !validDateTime(dto.requestedDate, dto.requestedEnd)) throw new BadRequestException('วันหรือเวลาไม่ถูกต้อง');
    const start = atBangkok(dto.requestedDate, dto.requestedStart);
    const end = atBangkok(dto.requestedDate, dto.requestedEnd);
    if (end <= start) throw new BadRequestException('ช่วงเวลาไม่ถูกต้อง');
    if (start <= new Date()) throw new BadRequestException('ไม่สามารถจองย้อนหลังได้');
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${service.requiredVehicleTypeId}))`;
      await this.assertCapacity(tx, service.id, service.requiredVehicleTypeId, start, end);
      const number = `BK-${dto.requestedDate.replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const booking = await tx.booking.create({ data: { bookingNumber: number, customerOrganizationId: user.organizationId, customerSiteId: site.id, serviceTypeId: service.id, requestedStartAt: start, requestedEndAt: end, estimatedVolume: dto.estimatedVolume, volumeUnit: dto.volumeUnit, customerNote: dto.customerNote, createdByUserId: user.id }, include: this.include });
      await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, statusType: 'BOOKING_STATUS', toValue: 'PENDING_CONFIRMATION', actorUserId: user.id } });
      return booking;
    });
    this.events.publish({ type: 'booking.created', bookingId: created.id, customerOrganizationId: user.organizationId, payload: { bookingNumber: created.bookingNumber } });
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
    this.events.publish({ type: 'booking.confirmed', bookingId: id, customerOrganizationId: current.customerOrganizationId });
    this.audit.record({ actorUserId: user.id, organizationId: user.organizationId, action: 'booking.confirmed', entityType: 'booking', entityId: id, beforeJson: { bookingStatus: current.bookingStatus }, afterJson: { bookingStatus: updated.bookingStatus } });
    return publicBooking(updated);
  }

  async assign(id: string, dto: AssignBookingDto, user: SessionUser) {
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    if (current.bookingStatus !== 'CONFIRMED' || current.jobStage !== 'SCHEDULED') throw new BadRequestException('ต้องยืนยัน Booking ก่อนจัดรถ');
    const [vehicle, service] = await Promise.all([
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId }, include: { vehicleType: true, maintenance: true } }),
      this.prisma.serviceType.findUnique({ where: { id: current.serviceTypeId } }),
    ]);
    if (!vehicle || !service || !vehicle.isActive || ['MAINTENANCE', 'INACTIVE'].includes(vehicle.status) || vehicle.vehicleTypeId !== service.requiredVehicleTypeId) throw new BadRequestException('รถคันนี้ไม่ตรงประเภทหรือไม่พร้อมจัดงาน');
    const start = current.confirmedStartAt ?? current.requestedStartAt;
    const end = current.confirmedEndAt ?? current.requestedEndAt;
    if (vehicle.maintenance.some((window) => window.status !== 'CANCELLED' && window.startsAt < end && window.endsAt > start)) throw new BadRequestException('รถคันนี้อยู่ระหว่างซ่อมบำรุงในช่วงเวลานี้');
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dto.vehicleId}))`;
      const fresh = await tx.booking.findUniqueOrThrow({ where: { id } });
      if (fresh.bookingStatus !== 'CONFIRMED' || fresh.jobStage !== 'SCHEDULED') throw new BadRequestException('Booking นี้ถูกเปลี่ยนแปลงแล้ว');
      const startAt = fresh.confirmedStartAt ?? fresh.requestedStartAt;
      const endAt = fresh.confirmedEndAt ?? fresh.requestedEndAt;
      const conflict = await tx.bookingAssignment.findFirst({ where: { vehicleId: dto.vehicleId, isCurrent: true, bookingId: { not: id }, booking: { bookingStatus: { notIn: ['CANCELLED', 'REJECTED'] }, jobStage: { not: 'COMPLETED' }, OR: [
        { confirmedStartAt: { not: null, lt: endAt }, confirmedEndAt: { not: null, gt: startAt } },
        { confirmedStartAt: null, requestedStartAt: { lt: endAt }, requestedEndAt: { gt: startAt } },
      ] } } });
      if (conflict) throw new BadRequestException('รถคันนี้มีงานชนกับช่วงเวลาที่เลือก');
      await tx.bookingAssignment.updateMany({ where: { bookingId: id, isCurrent: true }, data: { isCurrent: false, unassignedAt: new Date() } });
      await tx.bookingAssignment.create({ data: { bookingId: id, vehicleId: dto.vehicleId, driverUserId: dto.driverUserId, assignedByUserId: user.id, reason: dto.reason } });
      await tx.booking.update({ where: { id }, data: { assignmentStatus: 'ASSIGNED', version: { increment: 1 } } });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'ASSIGNMENT_STATUS', fromValue: 'UNASSIGNED', toValue: 'ASSIGNED', actorUserId: user.id } });
      return tx.booking.findUniqueOrThrow({ where: { id }, include: this.include });
    });
    this.events.publish({ type: 'booking.assignment.changed', bookingId: id, customerOrganizationId: current.customerOrganizationId, payload: { vehicleId: vehicle.id } });
    this.audit.record({ actorUserId: user.id, organizationId: user.organizationId, action: 'booking.assigned', entityType: 'booking', entityId: id, afterJson: { vehicleId: vehicle.id } });
    return publicBooking(updated);
  }

  async advance(id: string, user: SessionUser) {
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    if (current.bookingStatus !== 'CONFIRMED' || current.assignmentStatus !== 'ASSIGNED') throw new BadRequestException('ต้องยืนยันและจัดรถก่อนเริ่มงาน');
    if (current.jobStage === 'COMPLETED') throw new BadRequestException('Booking นี้จบขั้นตอนแล้ว');
    const jobStage = getNextJobStage(current.jobStage);
    const bookingStatus = current.bookingStatus;
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.booking.update({ where: { id }, data: { jobStage, bookingStatus, version: { increment: 1 } }, include: this.include });
      await tx.jobEvent.create({ data: { bookingId: id, eventType: jobStage, actorUserId: user.id } });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'JOB_STAGE', fromValue: current.jobStage, toValue: jobStage, actorUserId: user.id } });
      return item;
    });
    this.events.publish({ type: 'job.stage.changed', bookingId: id, customerOrganizationId: current.customerOrganizationId, payload: { jobStage } });
    this.audit.record({ actorUserId: user.id, organizationId: user.organizationId, action: 'booking.stage.changed', entityType: 'booking', entityId: id, beforeJson: { jobStage: current.jobStage }, afterJson: { jobStage } });
    return publicBooking(updated);
  }
}
