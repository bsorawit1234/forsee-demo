import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/request-user.js';
import { SessionGuard } from '../auth/session.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateTaskDto, TaskCommentDto, TaskStatusDto, UpdateTaskDto } from './task.dto.js';
import { TaskService } from './task.service.js';

@ApiTags('tasks')
@ApiCookieAuth('session')
@UseGuards(SessionGuard, RolesGuard)
@Controller('ops')
export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  @Get('bookings/:bookingId/tasks')
  @ApiParam({ name: 'bookingId', type: String, format: 'uuid' })
  @ApiParam({ name: 'bookingId', type: String, format: 'uuid' })
  @Roles('OWNER', 'ADMIN', 'STAFF')
  list(@Req() req: AuthenticatedRequest, @Param('bookingId') bookingId: string) { return this.tasks.list(bookingId, req.user); }

  @Post('bookings/:bookingId/tasks')
  @ApiParam({ name: 'bookingId', type: String, format: 'uuid' })
  @ApiBody({ type: CreateTaskDto })
  @Roles('OWNER', 'ADMIN')
  create(@Req() req: AuthenticatedRequest, @Param('bookingId') bookingId: string, @Body() dto: CreateTaskDto) { return this.tasks.create(bookingId, req.user, dto); }

  @Patch('tasks/:taskId')
  @ApiParam({ name: 'taskId', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateTaskDto })
  @Roles('OWNER', 'ADMIN')
  update(@Req() req: AuthenticatedRequest, @Param('taskId') taskId: string, @Body() dto: UpdateTaskDto) { return this.tasks.update(taskId, req.user, dto); }

  @Post('tasks/:taskId/status')
  @ApiParam({ name: 'taskId', type: String, format: 'uuid' })
  @ApiBody({ type: TaskStatusDto })
  @Roles('OWNER', 'ADMIN', 'STAFF')
  status(@Req() req: AuthenticatedRequest, @Param('taskId') taskId: string, @Body() dto: TaskStatusDto) { return this.tasks.status(taskId, req.user, dto); }

  @Post('tasks/:taskId/comment')
  @ApiParam({ name: 'taskId', type: String, format: 'uuid' })
  @ApiBody({ type: TaskCommentDto })
  @Roles('OWNER', 'ADMIN', 'STAFF')
  comment(@Req() req: AuthenticatedRequest, @Param('taskId') taskId: string, @Body() dto: TaskCommentDto) { return this.tasks.comment(taskId, req.user, dto); }
}
