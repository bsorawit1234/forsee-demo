import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: { actorUserId?: string; organizationId?: string; action: string; entityType: string; entityId: string; beforeJson?: unknown; afterJson?: unknown }) {
    void this.prisma.auditLog.create({ data: { actorUserId: input.actorUserId, organizationId: input.organizationId, action: input.action, entityType: input.entityType, entityId: input.entityId, beforeJson: input.beforeJson as object | undefined, afterJson: input.afterJson as object | undefined } }).catch(() => undefined);
  }
}
