import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { EventBus } from '../events/event-bus.js';
import type { SessionUser } from '../../common/request-user.js';
import type { AssignBookingDto, BookingActionDto, BookingListQueryDto, CreateBookingDto, CreateOpsBookingDto, UpdateBookingDto } from './booking.dto.js';
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

function bangkokParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(value).reduce<Record<string, string>>((result, part) => { result[part.type] = part.value; return result; }, {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function bookingSnapshot(item: any) {
  return {
    bookingStatus: item.bookingStatus,
    assignmentStatus: item.assignmentStatus,
    jobStage: item.jobStage,
    customerOrganizationId: item.customerOrganizationId,
    customerSiteId: item.customerSiteId,
    serviceTypeId: item.serviceTypeId,
    requestedStartAt: item.requestedStartAt instanceof Date ? item.requestedStartAt.toISOString() : item.requestedStartAt,
    requestedEndAt: item.requestedEndAt instanceof Date ? item.requestedEndAt.toISOString() : item.requestedEndAt,
    estimatedVolume: item.estimatedVolume?.toString?.() ?? item.estimatedVolume ?? null,
    volumeUnit: item.volumeUnit,
    customerNote: item.customerNote,
    internalNote: item.internalNote,
    responsibleUserId: item.responsibleUserId,
    source: item.source,
  };
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
    customerOrganizationId: item.customerOrganizationId,
    customerSiteId: item.customerSiteId,
    serviceCode: item.serviceType?.code,
    requiredVehicleTypeId: item.serviceType?.requiredVehicleTypeId,
    customerNote: item.customerNote,
    estimatedVolume: item.estimatedVolume,
    volumeUnit: item.volumeUnit,
    source: item.source,
    createdByUserId: item.createdByUserId,
    createdBy: item.createdBy ? { id: item.createdBy.id, displayName: item.createdBy.displayName, role: item.createdBy.memberships?.[0]?.role } : null,
    updatedByUserId: item.updatedByUserId,
    updatedBy: item.updatedBy ? { id: item.updatedBy.id, displayName: item.updatedBy.displayName } : null,
    responsibleUserId: item.responsibleUserId,
    responsibleUser: item.responsibleUser ? { id: item.responsibleUser.id, displayName: item.responsibleUser.displayName } : null,
    lastChangeReason: item.lastChangeReason,
    contactName: item.contactNameSnapshot,
    contactPhone: item.contactPhoneSnapshot,
    version: item.version,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function customerBookingView(item: any) {
  const view = publicBooking(item);
  const safe = { ...view } as Record<string, unknown>;
  ['source', 'createdByUserId', 'createdBy', 'updatedByUserId', 'updatedBy', 'responsibleUserId', 'responsibleUser', 'lastChangeReason'].forEach((key) => delete safe[key]);
  return safe;
}

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService, private readonly events: EventBus, private readonly audit: AuditService) {}

  private async assertStaffBookingAccess(id: string, user: SessionUser) {
    if (user.role !== 'STAFF') return;
    const allowed = await this.prisma.booking.count({ where: { id, OR: [{ responsibleUserId: user.id }, { tasks: { some: { assigneeUserId: user.id } } }, { assignments: { some: { driverUserId: user.id, isCurrent: true } } }] } });
    if (!allowed) throw new ForbiddenException('คุณไม่มีสิทธิ์ดำเนินการกับ Booking นี้');
  }

  private readonly include = {
    customerOrganization: true,
    customerSite: true,
    serviceType: true,
    createdBy: { include: { memberships: { select: { role: true } } } },
    updatedBy: true,
    responsibleUser: true,
    assignments: { where: { isCurrent: true }, include: { vehicle: { include: { vehicleType: true } } } },
  } as const;

  private async assertCapacity(tx: Prisma.TransactionClient, serviceTypeId: string, vehicleTypeId: string, start: Date, end: Date, excludeBookingId?: string) {
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
      tx.booking.count({ where: { id: excludeBookingId ? { not: excludeBookingId } : undefined, bookingStatus: { notIn: ['CANCELLED', 'REJECTED'] }, requestedStartAt: { lt: end }, requestedEndAt: { gt: start }, serviceType: { requiredVehicleTypeId: vehicleTypeId } } }),
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
    return { items: items.map(customerBookingView), total: items.length };
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

  async createOpsBooking(user: SessionUser, dto: CreateOpsBookingDto) {
    if (user.organizationType !== 'OPERATOR') throw new ForbiddenException('เฉพาะทีมปฏิบัติการเท่านั้นที่สร้าง Booking แทนลูกค้าได้');
    const [customer, site, service, responsible] = await Promise.all([
      this.prisma.organization.findFirst({ where: { id: dto.customerOrganizationId, type: 'CUSTOMER', status: 'ACTIVE' } }),
      this.prisma.customerSite.findFirst({ where: { id: dto.customerSiteId, customerOrganizationId: dto.customerOrganizationId, isActive: true } }),
      this.prisma.serviceType.findFirst({ where: { code: dto.serviceCode, isActive: true } }),
      dto.responsibleUserId ? this.prisma.organizationMembership.findFirst({ where: { organizationId: user.organizationId, userId: dto.responsibleUserId, status: 'ACTIVE', user: { status: 'ACTIVE' } } }) : Promise.resolve(null),
    ]);
    if (!customer) throw new BadRequestException('ไม่พบบริษัทลูกค้าที่ใช้งานอยู่');
    if (!site) throw new BadRequestException('สถานที่นี้ไม่อยู่ภายใต้บริษัทลูกค้าที่เลือก');
    if (!service) throw new BadRequestException('ไม่พบบริการที่เลือก');
    if (dto.responsibleUserId && !responsible) throw new BadRequestException('ผู้รับผิดชอบต้องเป็นสมาชิกทีมปฏิบัติการที่ใช้งานอยู่');
    if (!validDateTime(dto.requestedDate, dto.requestedStart) || !validDateTime(dto.requestedDate, dto.requestedEnd)) throw new BadRequestException('วันหรือเวลาไม่ถูกต้อง');
    const start = atBangkok(dto.requestedDate, dto.requestedStart);
    const end = atBangkok(dto.requestedDate, dto.requestedEnd);
    if (end <= start || start <= new Date()) throw new BadRequestException('ช่วงเวลาต้องเป็นเวลาในอนาคต');
    const bookingStatus = dto.confirmImmediately ? 'CONFIRMED' : 'PENDING_CONFIRMATION';
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${service.requiredVehicleTypeId}))`;
      await this.assertCapacity(tx, service.id, service.requiredVehicleTypeId, start, end);
      const number = `BK-${dto.requestedDate.replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const booking = await tx.booking.create({ data: {
        bookingNumber: number,
        customerOrganizationId: customer.id,
        customerSiteId: site.id,
        serviceTypeId: service.id,
        requestedStartAt: start,
        requestedEndAt: end,
        confirmedStartAt: dto.confirmImmediately ? start : undefined,
        confirmedEndAt: dto.confirmImmediately ? end : undefined,
        bookingStatus,
        confirmedByUserId: dto.confirmImmediately ? user.id : undefined,
        estimatedVolume: dto.estimatedVolume,
        volumeUnit: dto.volumeUnit,
        customerNote: dto.customerNote,
        internalNote: dto.internalNote,
        source: dto.source ?? 'ADMIN_PHONE',
        createdByUserId: user.id,
        updatedByUserId: user.id,
        responsibleUserId: dto.responsibleUserId,
        contactNameSnapshot: dto.contactName,
        contactPhoneSnapshot: dto.contactPhone,
      }, include: this.include });
      await tx.bookingStatusHistory.create({ data: { bookingId: booking.id, statusType: 'BOOKING_STATUS', toValue: bookingStatus, actorUserId: user.id, note: dto.internalNote } });
      await tx.bookingRevision.create({ data: { bookingId: booking.id, version: booking.version, actorUserId: user.id, action: 'booking.created', reason: dto.internalNote, changedFields: bookingSnapshot(booking), beforeJson: {}, afterJson: bookingSnapshot(booking) } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'booking.created.by_admin', entityType: 'booking', entityId: booking.id, afterJson: { ...bookingSnapshot(booking), source: booking.source } });
      const task = await tx.operationTask.create({ data: { bookingId: booking.id, title: 'โทร/บันทึกการยืนยัน', description: 'ตรวจสอบรายละเอียดกับลูกค้าและบันทึกผลการยืนยัน', status: dto.confirmImmediately ? 'DONE' : 'TODO', priority: 'HIGH', assigneeUserId: dto.responsibleUserId, isRequired: true, completedAt: dto.confirmImmediately ? new Date() : undefined, createdByUserId: user.id, updatedByUserId: user.id } });
      const taskAction = await tx.taskActivity.create({ data: { taskId: task.id, actorUserId: user.id, action: 'task.created', reason: 'สร้างจาก Booking intake template', afterJson: { title: task.title, status: task.status, assigneeUserId: task.assigneeUserId, isRequired: task.isRequired } } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'task.created.from_booking_template', entityType: 'operation_task', entityId: task.id, afterJson: { title: task.title, status: task.status, assigneeUserId: task.assigneeUserId, isRequired: task.isRequired, activityId: taskAction.id } });
      return booking;
    });
    this.events.publish({ type: 'booking.created', bookingId: created.id, customerOrganizationId: created.customerOrganizationId, payload: { bookingNumber: created.bookingNumber, source: created.source } });
    return publicBooking(created);
  }

  async updateOpsBooking(id: string, user: SessionUser, dto: UpdateBookingDto) {
    if (user.organizationType !== 'OPERATOR') throw new ForbiddenException('เฉพาะทีมปฏิบัติการเท่านั้นที่แก้ Booking ได้');
    const current = await this.prisma.booking.findUnique({ where: { id }, include: { ...this.include } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    if (current.version !== dto.version) throw new ConflictException({ code: 'BOOKING_VERSION_CONFLICT', message: 'รายการนี้ถูกแก้ไขโดยผู้ใช้อื่นแล้ว' });
    const reason = dto.changeReason?.trim();
    if (!reason || reason.length < 5) throw new BadRequestException('กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 5 ตัวอักษร');
    if (current.jobStage !== 'SCHEDULED' && !(dto.override && user.role === 'OWNER')) throw new ForbiddenException('Booking ที่เริ่มงานแล้วต้องให้ Owner override เท่านั้น');
    const currentParts = bangkokParts(current.requestedStartAt);
    const requestedDate = dto.requestedDate ?? currentParts.date;
    const requestedStart = dto.requestedStart ?? currentParts.time;
    const currentEndParts = bangkokParts(current.requestedEndAt);
    const requestedEnd = dto.requestedEnd ?? currentEndParts.time;
    if (!validDateTime(requestedDate, requestedStart) || !validDateTime(requestedDate, requestedEnd)) throw new BadRequestException('วันหรือเวลาไม่ถูกต้อง');
    const start = atBangkok(requestedDate, requestedStart);
    const end = atBangkok(requestedDate, requestedEnd);
    if (end <= start) throw new BadRequestException('ช่วงเวลาไม่ถูกต้อง');
    const [service, site, responsible] = await Promise.all([
      this.prisma.serviceType.findFirst({ where: { code: dto.serviceCode ?? current.serviceType.code, isActive: true } }),
      this.prisma.customerSite.findFirst({ where: { id: dto.customerSiteId ?? current.customerSiteId, customerOrganizationId: current.customerOrganizationId, isActive: true } }),
      dto.responsibleUserId ? this.prisma.organizationMembership.findFirst({ where: { organizationId: user.organizationId, userId: dto.responsibleUserId, status: 'ACTIVE', user: { status: 'ACTIVE' } } }) : Promise.resolve(null),
    ]);
    if (!service) throw new BadRequestException('ไม่พบบริการที่เลือก');
    if (!site) throw new BadRequestException('สถานที่นี้ไม่อยู่ภายใต้บริษัทลูกค้า');
    if (dto.responsibleUserId && !responsible) throw new BadRequestException('ผู้รับผิดชอบไม่ใช่สมาชิกทีมปฏิบัติการที่ใช้งานอยู่');
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    const nextValues = {
      customerSiteId: site.id,
      serviceTypeId: service.id,
      requestedStartAt: start,
      requestedEndAt: end,
      estimatedVolume: dto.estimatedVolume ?? current.estimatedVolume,
      volumeUnit: dto.volumeUnit ?? current.volumeUnit,
      customerNote: dto.customerNote ?? current.customerNote,
      internalNote: dto.internalNote ?? current.internalNote,
      responsibleUserId: dto.responsibleUserId ?? current.responsibleUserId,
    };
    const before = bookingSnapshot(current);
    const compare = (key: keyof typeof nextValues, beforeValue: unknown, afterValue: unknown) => {
      const beforeText = beforeValue instanceof Date ? beforeValue.toISOString() : beforeValue?.toString?.() ?? beforeValue;
      const afterText = afterValue instanceof Date ? afterValue.toISOString() : afterValue?.toString?.() ?? afterValue;
      if (beforeText !== afterText) changes[key] = { before: beforeText ?? null, after: afterText ?? null };
    };
    compare('customerSiteId', current.customerSiteId, nextValues.customerSiteId);
    compare('serviceTypeId', current.serviceTypeId, nextValues.serviceTypeId);
    compare('requestedStartAt', current.requestedStartAt, nextValues.requestedStartAt);
    compare('requestedEndAt', current.requestedEndAt, nextValues.requestedEndAt);
    compare('estimatedVolume', current.estimatedVolume, nextValues.estimatedVolume);
    compare('volumeUnit', current.volumeUnit, nextValues.volumeUnit);
    compare('customerNote', current.customerNote, nextValues.customerNote);
    compare('internalNote', current.internalNote, nextValues.internalNote);
    compare('responsibleUserId', current.responsibleUserId, nextValues.responsibleUserId);
    if (!Object.keys(changes).length) throw new BadRequestException('ไม่มีข้อมูลใหม่สำหรับการแก้ไข');
    const scheduleChanged = Boolean(changes.serviceTypeId || changes.requestedStartAt || changes.requestedEndAt || changes.estimatedVolume);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${service.requiredVehicleTypeId}))`;
      const fresh = await tx.booking.findUnique({ where: { id }, include: { ...this.include } });
      if (!fresh) throw new NotFoundException('ไม่พบ Booking');
      if (fresh.version !== dto.version) throw new ConflictException({ code: 'BOOKING_VERSION_CONFLICT', message: 'รายการนี้ถูกแก้ไขโดยผู้ใช้อื่นแล้ว' });
      if (scheduleChanged) await this.assertCapacity(tx, service.id, service.requiredVehicleTypeId, start, end, id);
      const assignment = fresh.assignments?.[0];
      const assignmentInvalid = Boolean(assignment && (assignment.vehicle.vehicleTypeId !== service.requiredVehicleTypeId || await tx.vehicleMaintenance.count({ where: { vehicleId: assignment.vehicle.id, status: { not: 'CANCELLED' }, startsAt: { lt: end }, endsAt: { gt: start } } }) > 0));
      if (assignmentInvalid && dto.assignmentResolution !== 'UNASSIGN_IF_INVALID') throw new UnprocessableEntityException({ code: 'ASSIGNMENT_RESOLUTION_REQUIRED', message: 'การแก้ไขนี้กระทบรถที่จัดไว้ กรุณายืนยันการถอดรถ' });
      const data: any = { ...nextValues, updatedByUserId: user.id, lastChangeReason: reason, version: { increment: 1 } };
      if (fresh.bookingStatus === 'CONFIRMED') { data.confirmedStartAt = start; data.confirmedEndAt = end; }
      if (assignmentInvalid) {
        await tx.bookingAssignment.updateMany({ where: { bookingId: id, isCurrent: true }, data: { isCurrent: false, unassignedAt: new Date(), reason } });
        data.assignmentStatus = 'UNASSIGNED';
      }
      const item = await tx.booking.update({ where: { id }, data, include: this.include });
      await tx.bookingRevision.create({ data: { bookingId: id, version: item.version, actorUserId: user.id, action: 'booking.updated', reason, changedFields: changes as Prisma.InputJsonValue, beforeJson: before, afterJson: bookingSnapshot(item) } });
      if (assignmentInvalid) await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'ASSIGNMENT_STATUS', fromValue: 'ASSIGNED', toValue: 'UNASSIGNED', actorUserId: user.id, note: reason } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: dto.override ? 'booking.updated.override' : 'booking.updated', entityType: 'booking', entityId: id, beforeJson: { ...before, version: dto.version }, afterJson: { ...bookingSnapshot(item), changedFields: changes, changeReason: reason } });
      return item;
    });
    this.events.publish({ type: 'booking.updated', bookingId: id, customerOrganizationId: updated.customerOrganizationId, payload: { version: updated.version, assignmentStatus: updated.assignmentStatus } });
    if (updated.assignmentStatus === 'UNASSIGNED' && current.assignmentStatus === 'ASSIGNED') this.events.publish({ type: 'booking.assignment.changed', bookingId: id, customerOrganizationId: updated.customerOrganizationId });
    return publicBooking(updated);
  }

  async cancelOpsBooking(id: string, user: SessionUser, dto: BookingActionDto) {
    if (user.organizationType !== 'OPERATOR') throw new ForbiddenException('เฉพาะทีมปฏิบัติการเท่านั้นที่ยกเลิก Booking ได้');
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    if (current.jobStage === 'COMPLETED') throw new BadRequestException('งานที่เสร็จสิ้นแล้วไม่สามารถยกเลิกได้');
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 5) throw new BadRequestException('กรุณาระบุเหตุผล');
    if (current.bookingStatus === 'CANCELLED') return this.findOne(id, user);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.booking.update({ where: { id }, data: { bookingStatus: 'CANCELLED', cancelledByUserId: user.id, cancelledReason: reason, updatedByUserId: user.id, lastChangeReason: reason, version: { increment: 1 } }, include: this.include });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'BOOKING_STATUS', fromValue: current.bookingStatus, toValue: 'CANCELLED', actorUserId: user.id, note: reason } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'booking.cancelled', entityType: 'booking', entityId: id, beforeJson: { bookingStatus: current.bookingStatus }, afterJson: { bookingStatus: 'CANCELLED', reason } });
      return item;
    });
    this.events.publish({ type: 'booking.cancelled', bookingId: id, customerOrganizationId: current.customerOrganizationId });
    return publicBooking(updated);
  }

  async rejectOpsBooking(id: string, user: SessionUser, dto: BookingActionDto) {
    if (user.organizationType !== 'OPERATOR') throw new ForbiddenException('เฉพาะทีมปฏิบัติการเท่านั้นที่ปฏิเสธ Booking ได้');
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 5) throw new BadRequestException('กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
    if (current.bookingStatus !== 'PENDING_CONFIRMATION') throw new BadRequestException('ปฏิเสธได้เฉพาะ Booking ที่รอยืนยัน');
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.booking.update({ where: { id }, data: { bookingStatus: 'REJECTED', updatedByUserId: user.id, lastChangeReason: reason, version: { increment: 1 } }, include: this.include });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'BOOKING_STATUS', fromValue: current.bookingStatus, toValue: 'REJECTED', actorUserId: user.id, note: reason } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'booking.rejected', entityType: 'booking', entityId: id, beforeJson: { bookingStatus: current.bookingStatus }, afterJson: { bookingStatus: 'REJECTED', reason, version: item.version } });
      return item;
    });
    this.events.publish({ type: 'booking.rejected', bookingId: id, customerOrganizationId: current.customerOrganizationId });
    return publicBooking(updated);
  }

  async findOne(id: string, user: SessionUser) {
    const where: any = { id };
    if (user.organizationType === 'CUSTOMER') where.customerOrganizationId = user.organizationId;
    if (user.role === 'STAFF') where.OR = [{ responsibleUserId: user.id }, { tasks: { some: { assigneeUserId: user.id } } }, { assignments: { some: { driverUserId: user.id, isCurrent: true } } }];
    const isCustomer = user.organizationType === 'CUSTOMER';
    const item: any = await this.prisma.booking.findFirst({ where, include: isCustomer ? { ...this.include, statusHistory: { orderBy: { occurredAt: 'asc' } }, jobEvents: { orderBy: { occurredAt: 'asc' } } } : { ...this.include, statusHistory: { orderBy: { occurredAt: 'asc' } }, jobEvents: { orderBy: { occurredAt: 'asc' } }, revisions: { orderBy: { occurredAt: 'asc' } }, tasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { activities: { orderBy: { occurredAt: 'asc' } } } } } });
    if (!item) throw new NotFoundException('ไม่พบ Booking');
    if (isCustomer) {
      return { ...customerBookingView(item), history: item.statusHistory.filter((entry: any) => ['BOOKING_STATUS', 'JOB_STAGE'].includes(entry.statusType)).map((entry: any) => ({ id: entry.id, statusType: entry.statusType, fromValue: entry.fromValue, toValue: entry.toValue, occurredAt: entry.occurredAt })), events: item.jobEvents.map((entry: any) => ({ id: entry.id, eventType: entry.eventType, occurredAt: entry.occurredAt, note: entry.note })) };
    }
    return { ...publicBooking(item), history: item.statusHistory, events: item.jobEvents, revisions: item.revisions, tasks: item.tasks };
  }

  async timeline(id: string, user: SessionUser) {
    const detail = await this.findOne(id, user) as any;
    return { bookingId: id, items: [...(detail.history ?? []).map((entry: any) => ({ kind: 'booking.history', occurredAt: entry.occurredAt, ...entry })), ...(detail.events ?? []).map((entry: any) => ({ kind: 'job.event', occurredAt: entry.occurredAt, ...entry })), ...(detail.revisions ?? []).map((entry: any) => ({ kind: 'booking.revision', occurredAt: entry.occurredAt, ...entry }))].sort((left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()) };
  }

  async revisions(id: string, user: SessionUser) {
    const detail = await this.findOne(id, user) as any;
    return { bookingId: id, items: detail.revisions ?? [] };
  }

  async opsList(query: BookingListQueryDto, user?: SessionUser) {
    const where: any = user?.role === 'STAFF' ? { OR: [{ responsibleUserId: user.id }, { tasks: { some: { assigneeUserId: user.id } } }, { assignments: { some: { driverUserId: user.id, isCurrent: true } } }] } : {};
    if (query.status) where.bookingStatus = query.status;
    if (query.from || query.to) where.requestedStartAt = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lt: new Date(query.to) } : {}) };
    const items = await this.prisma.booking.findMany({ where, include: this.include, orderBy: { requestedStartAt: 'asc' } });
    return { items: items.map(publicBooking), total: items.length };
  }

  async dashboard(user?: SessionUser) {
    const scope: any = user?.role === 'STAFF' ? { OR: [{ responsibleUserId: user.id }, { tasks: { some: { assigneeUserId: user.id } } }, { assignments: { some: { driverUserId: user.id, isCurrent: true } } }] } : {};
    const [total, pending, unassigned, inProgress, atRisk] = await Promise.all([
      this.prisma.booking.count({ where: scope }),
      this.prisma.booking.count({ where: { ...scope, bookingStatus: 'PENDING_CONFIRMATION' } }),
      this.prisma.booking.count({ where: { ...scope, assignmentStatus: 'UNASSIGNED', bookingStatus: { not: 'CANCELLED' } } }),
      this.prisma.booking.count({ where: { ...scope, jobStage: { in: ['EN_ROUTE', 'ARRIVED', 'IN_SERVICE'] } } }),
      this.prisma.booking.count({ where: { ...scope, slaHealth: { in: ['AT_RISK', 'OVERDUE'] } } }),
    ]);
    return { total, pending, unassigned, inProgress, atRisk };
  }

  async confirm(id: string, user: SessionUser) {
    await this.assertStaffBookingAccess(id, user);
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    if (current.bookingStatus === 'CANCELLED' || current.bookingStatus === 'REJECTED') throw new BadRequestException('Booking นี้ไม่สามารถยืนยันได้');
    if (current.bookingStatus === 'CONFIRMED') return this.findOne(id, user);
    const updated = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({ where: { id }, data: { bookingStatus: 'CONFIRMED', confirmedByUserId: user.id, confirmedStartAt: current.requestedStartAt, confirmedEndAt: current.requestedEndAt, updatedByUserId: user.id, lastChangeReason: 'ยืนยันข้อมูลกับลูกค้าแล้ว', version: { increment: 1 } }, include: this.include });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'BOOKING_STATUS', fromValue: current.bookingStatus, toValue: 'CONFIRMED', actorUserId: user.id } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'booking.confirmed', entityType: 'booking', entityId: id, beforeJson: { bookingStatus: current.bookingStatus }, afterJson: { bookingStatus: booking.bookingStatus, version: booking.version } });
      return booking;
    });
    this.events.publish({ type: 'booking.confirmed', bookingId: id, customerOrganizationId: current.customerOrganizationId });
    return publicBooking(updated);
  }

  async assign(id: string, dto: AssignBookingDto, user: SessionUser) {
    await this.assertStaffBookingAccess(id, user);
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
      await tx.booking.update({ where: { id }, data: { assignmentStatus: 'ASSIGNED', updatedByUserId: user.id, lastChangeReason: dto.reason, version: { increment: 1 } } });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'ASSIGNMENT_STATUS', fromValue: 'UNASSIGNED', toValue: 'ASSIGNED', actorUserId: user.id } });
      const item = await tx.booking.findUniqueOrThrow({ where: { id }, include: this.include });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'booking.assigned', entityType: 'booking', entityId: id, afterJson: { vehicleId: vehicle.id, driverUserId: dto.driverUserId ?? null, version: item.version } });
      return item;
    });
    this.events.publish({ type: 'booking.assignment.changed', bookingId: id, customerOrganizationId: current.customerOrganizationId, payload: { vehicleId: vehicle.id } });
    return publicBooking(updated);
  }

  async advance(id: string, user: SessionUser) {
    await this.assertStaffBookingAccess(id, user);
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('ไม่พบ Booking');
    if (current.bookingStatus !== 'CONFIRMED' || current.assignmentStatus !== 'ASSIGNED') throw new BadRequestException('ต้องยืนยันและจัดรถก่อนเริ่มงาน');
    if (current.jobStage === 'COMPLETED') throw new BadRequestException('Booking นี้จบขั้นตอนแล้ว');
    const jobStage = getNextJobStage(current.jobStage);
    if (jobStage === 'COMPLETED') {
      const pendingRequiredTasks = await this.prisma.operationTask.count({ where: { bookingId: id, isRequired: true, status: { notIn: ['DONE', 'CANCELLED'] } } });
      if (pendingRequiredTasks > 0) throw new BadRequestException('ยังมี Task ที่จำเป็นต้องทำให้เสร็จก่อนปิด Booking');
    }
    const bookingStatus = current.bookingStatus;
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.booking.update({ where: { id }, data: { jobStage, bookingStatus, updatedByUserId: user.id, lastChangeReason: `เลื่อนขั้นตอนเป็น ${jobStage}`, version: { increment: 1 } }, include: this.include });
      await tx.jobEvent.create({ data: { bookingId: id, eventType: jobStage, actorUserId: user.id } });
      await tx.bookingStatusHistory.create({ data: { bookingId: id, statusType: 'JOB_STAGE', fromValue: current.jobStage, toValue: jobStage, actorUserId: user.id } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'booking.stage.changed', entityType: 'booking', entityId: id, beforeJson: { jobStage: current.jobStage }, afterJson: { jobStage, version: item.version } });
      return item;
    });
    this.events.publish({ type: 'job.stage.changed', bookingId: id, customerOrganizationId: current.customerOrganizationId, payload: { jobStage } });
    return publicBooking(updated);
  }
}
