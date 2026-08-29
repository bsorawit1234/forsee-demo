import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MembershipRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/request-user.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user && required.includes(request.user.role as MembershipRole)) return true;
    throw new ForbiddenException('คุณไม่มีสิทธิ์ใช้งานรายการนี้');
  }
}
