import { Controller, Get, NotFoundException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/request-user.js';
import { SessionGuard } from '../auth/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AuditService } from '../../common/audit.service.js';
import { AuditListQueryDto } from './audit.dto.js';

@ApiTags('audit')
@ApiCookieAuth('session')
@UseGuards(SessionGuard, RolesGuard)
@Roles('OWNER')
@Controller('owner/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: AuditListQueryDto) {
    return this.audit.list(request.user.organizationId, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    const item = await this.audit.findOne(request.user.organizationId, id);
    if (!item) throw new NotFoundException('ไม่พบ Audit Log');
    return item;
  }
}
