import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(client: PrismaService | Prisma.TransactionClient, input: { actorUserId?: string; organizationId?: string; action: string; entityType: string; entityId: string; beforeJson?: unknown; afterJson?: unknown }) {
    return client.auditLog.create({ data: { actorUserId: input.actorUserId, organizationId: input.organizationId, action: input.action, entityType: input.entityType, entityId: input.entityId, beforeJson: input.beforeJson as object | undefined, afterJson: input.afterJson as object | undefined } });
  }

  async list(organizationId: string, query: { from?: string; to?: string; actorUserId?: string; action?: string; entityType?: string; entityId?: string; page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 50));
    const createdAt: { gte?: Date; lt?: Date } = {};
    if (query.from) createdAt.gte = new Date(query.from);
    if (query.to) createdAt.lt = new Date(query.to);
    const where: any = {
      organizationId,
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.auditLog.count({ where }),
    ]);
    const actorIds = [...new Set(items.map((item) => item.actorUserId).filter((value): value is string => Boolean(value)))];
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true, email: true } });
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    return { items: items.map((item) => ({ ...item, actorUser: item.actorUserId ? actorById.get(item.actorUserId) ?? null : null })), total, page, pageSize };
  }

  async findOne(organizationId: string, id: string) {
    const item = await this.prisma.auditLog.findFirst({ where: { id, organizationId } });
    if (!item) return null;
    const actorUser = item.actorUserId ? await this.prisma.user.findUnique({ where: { id: item.actorUserId }, select: { id: true, displayName: true, email: true } }) : null;
    return { ...item, actorUser };
  }
}
