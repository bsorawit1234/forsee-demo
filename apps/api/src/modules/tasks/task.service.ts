import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../../common/audit.service.js';
import { EventBus } from '../events/event-bus.js';
import type { SessionUser } from '../../common/request-user.js';
import type { CreateTaskDto, TaskCommentDto, TaskStatusDto, UpdateTaskDto } from './task.dto.js';

function taskJson(task: any) {
  return { title: task.title, description: task.description, status: task.status, priority: task.priority, assigneeUserId: task.assigneeUserId, dueAt: task.dueAt instanceof Date ? task.dueAt.toISOString() : task.dueAt, isRequired: task.isRequired, version: task.version };
}

function taskView(task: any) {
  return {
    id: task.id,
    bookingId: task.bookingId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigneeUserId: task.assigneeUserId,
    assignee: task.assignee ? { id: task.assignee.id, displayName: task.assignee.displayName } : null,
    dueAt: task.dueAt,
    isRequired: task.isRequired,
    version: task.version,
    completedAt: task.completedAt,
    createdBy: task.createdBy ? { id: task.createdBy.id, displayName: task.createdBy.displayName } : null,
    updatedBy: task.updatedBy ? { id: task.updatedBy.id, displayName: task.updatedBy.displayName } : null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    activities: task.activities?.map((activity: any) => ({ id: activity.id, action: activity.action, reason: activity.reason, note: activity.note, actorUserId: activity.actorUserId, occurredAt: activity.occurredAt })) ?? [],
  };
}

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly events: EventBus) {}

  private readonly include = {
    assignee: true,
    createdBy: true,
    updatedBy: true,
    activities: { orderBy: { occurredAt: 'asc' as const } },
  } as const;

  private async assertAssignee(user: SessionUser, assigneeUserId?: string) {
    if (!assigneeUserId) return;
    const membership = await this.prisma.organizationMembership.findFirst({ where: { organizationId: user.organizationId, userId: assigneeUserId, status: 'ACTIVE', user: { status: 'ACTIVE' } } });
    if (!membership) throw new BadRequestException('ผู้รับผิดชอบต้องเป็นสมาชิกทีมปฏิบัติการที่ใช้งานอยู่');
  }

  private async bookingForOps(bookingId: string, user: SessionUser) {
    if (user.organizationType !== 'OPERATOR') throw new ForbiddenException('เฉพาะทีมปฏิบัติการเท่านั้นที่จัดการ Task ได้');
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('ไม่พบ Booking');
    return booking;
  }

  async list(bookingId: string, user: SessionUser) {
    await this.bookingForOps(bookingId, user);
    const tasks = await this.prisma.operationTask.findMany({ where: { bookingId }, include: this.include, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
    return { items: tasks.map(taskView), total: tasks.length };
  }

  async create(bookingId: string, user: SessionUser, dto: CreateTaskDto) {
    await this.bookingForOps(bookingId, user);
    await this.assertAssignee(user, dto.assigneeUserId);
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : undefined;
    if (dueAt && Number.isNaN(dueAt.getTime())) throw new BadRequestException('dueAt ไม่ถูกต้อง');
    const created = await this.prisma.$transaction(async (tx) => {
      const task = await tx.operationTask.create({ data: { bookingId, title: dto.title.trim(), description: dto.description, assigneeUserId: dto.assigneeUserId, priority: dto.priority ?? 'NORMAL', dueAt, isRequired: dto.isRequired ?? false, createdByUserId: user.id, updatedByUserId: user.id }, include: this.include });
      const activity = await tx.taskActivity.create({ data: { taskId: task.id, actorUserId: user.id, action: 'task.created', afterJson: taskJson(task) } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'task.created', entityType: 'operation_task', entityId: task.id, afterJson: taskJson(task) });
      return { task, activity };
    });
    this.events.publish({ type: 'task.created', bookingId, customerOrganizationId: (await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, select: { customerOrganizationId: true } })).customerOrganizationId, payload: { taskId: created.task.id } });
    return taskView({ ...created.task, activities: [created.activity] });
  }

  async update(taskId: string, user: SessionUser, dto: UpdateTaskDto) {
    if (user.organizationType !== 'OPERATOR') throw new ForbiddenException('เฉพาะทีมปฏิบัติการเท่านั้นที่แก้ Task ได้');
    const current = await this.prisma.operationTask.findUnique({ where: { id: taskId }, include: this.include });
    if (!current) throw new NotFoundException('ไม่พบ Task');
    if (user.role === 'STAFF' && current.assigneeUserId !== user.id) throw new ForbiddenException('แก้ได้เฉพาะ Task ที่มอบหมายให้คุณ');
    if (user.role === 'STAFF' && dto.assigneeUserId !== undefined && dto.assigneeUserId !== current.assigneeUserId) throw new ForbiddenException('Staff ไม่สามารถเปลี่ยนผู้รับผิดชอบ Task');
    if (current.version !== dto.version) throw new ConflictException({ code: 'TASK_VERSION_CONFLICT', message: 'Task นี้ถูกแก้ไขโดยผู้ใช้อื่นแล้ว' });
    await this.assertAssignee(user, dto.assigneeUserId);
    const nextStatus = dto.status ?? current.status;
    const changedStatus = nextStatus !== current.status;
    const changedAssignee = dto.assigneeUserId !== undefined && dto.assigneeUserId !== current.assigneeUserId;
    const reason = dto.changeReason?.trim();
    if ((changedStatus || changedAssignee) && (!reason || reason.length < 3)) throw new BadRequestException('กรุณาระบุเหตุผลการเปลี่ยน Task');
    const dueAt = dto.dueAt !== undefined ? (dto.dueAt ? new Date(dto.dueAt) : null) : current.dueAt;
    if (dueAt && Number.isNaN(dueAt.getTime())) throw new BadRequestException('dueAt ไม่ถูกต้อง');
    const updated = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.operationTask.findUnique({ where: { id: taskId }, include: this.include });
      if (!fresh) throw new NotFoundException('ไม่พบ Task');
      if (fresh.version !== dto.version) throw new ConflictException({ code: 'TASK_VERSION_CONFLICT', message: 'Task นี้ถูกแก้ไขโดยผู้ใช้อื่นแล้ว' });
      const data: Prisma.OperationTaskUncheckedUpdateInput = { title: dto.title?.trim(), description: dto.description, priority: dto.priority, assigneeUserId: dto.assigneeUserId, dueAt, isRequired: dto.isRequired, status: nextStatus, updatedByUserId: user.id, version: { increment: 1 }, completedAt: nextStatus === 'DONE' ? (fresh.completedAt ?? new Date()) : null };
      const item = await tx.operationTask.update({ where: { id: taskId }, data, include: this.include });
      const activity = await tx.taskActivity.create({ data: { taskId, actorUserId: user.id, action: changedStatus ? 'task.status.changed' : changedAssignee ? 'task.assigned' : 'task.updated', reason, beforeJson: taskJson(fresh), afterJson: taskJson(item) } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: changedStatus ? 'task.status.changed' : changedAssignee ? 'task.assigned' : 'task.updated', entityType: 'operation_task', entityId: taskId, beforeJson: taskJson(fresh), afterJson: taskJson(item) });
      return { item, activity };
    });
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: updated.item.bookingId }, select: { customerOrganizationId: true } });
    this.events.publish({ type: changedStatus ? 'task.status.changed' : changedAssignee ? 'task.assigned' : 'task.updated', bookingId: updated.item.bookingId, customerOrganizationId: booking.customerOrganizationId, payload: { taskId, version: updated.item.version } });
    return taskView({ ...updated.item, activities: [...(updated.item.activities ?? []), updated.activity] });
  }

  async status(taskId: string, user: SessionUser, dto: TaskStatusDto) {
    const current = await this.prisma.operationTask.findUnique({ where: { id: taskId } });
    if (!current) throw new NotFoundException('ไม่พบ Task');
    return this.update(taskId, user, { version: current.version, status: dto.status, changeReason: dto.reason } as UpdateTaskDto);
  }

  async comment(taskId: string, user: SessionUser, dto: TaskCommentDto) {
    if (user.organizationType !== 'OPERATOR') throw new ForbiddenException('เฉพาะทีมปฏิบัติการเท่านั้นที่แสดงความคิดเห็นได้');
    const task = await this.prisma.operationTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('ไม่พบ Task');
    if (user.role === 'STAFF' && task.assigneeUserId !== user.id) throw new ForbiddenException('แสดงความคิดเห็นได้เฉพาะ Task ที่มอบหมายให้คุณ');
    const activity = await this.prisma.$transaction(async (tx) => {
      const item = await tx.taskActivity.create({ data: { taskId, actorUserId: user.id, action: 'task.comment.added', note: dto.note.trim() } });
      await this.audit.record(tx, { actorUserId: user.id, organizationId: user.organizationId, action: 'task.comment.added', entityType: 'operation_task', entityId: taskId, afterJson: { note: dto.note.trim() } });
      return item;
    });
    return activity;
  }
}
