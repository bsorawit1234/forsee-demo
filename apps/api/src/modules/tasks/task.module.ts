import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CommonModule } from '../../common/common.module.js';
import { TaskController } from './task.controller.js';
import { TaskService } from './task.service.js';

@Module({ imports: [AuthModule, CommonModule], controllers: [TaskController], providers: [TaskService] })
export class TaskModule {}
