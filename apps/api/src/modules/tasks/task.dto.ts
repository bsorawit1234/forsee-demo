import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const taskStatuses = ['TODO', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE', 'CANCELLED'] as const;
const taskPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

export class CreateTaskDto {
  @ApiProperty({ example: 'โทรยืนยันข้อมูลกับลูกค้า', type: String })
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({ example: 'ยืนยันปริมาณและเวลาเข้าบริการ', type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  assigneeUserId?: string;

  @ApiPropertyOptional({ enum: taskPriorities, default: 'NORMAL' })
  @IsOptional()
  @IsIn(taskPriorities)
  priority?: typeof taskPriorities[number];

  @ApiPropertyOptional({ type: String, example: '2026-09-10T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class UpdateTaskDto extends CreateTaskDto {
  @ApiProperty({ example: 1, type: Number })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ enum: taskStatuses })
  @IsOptional()
  @IsIn(taskStatuses)
  status?: typeof taskStatuses[number];

  @ApiPropertyOptional({ example: 'ลูกค้าแจ้งข้อมูลครบแล้ว', type: String })
  @IsOptional()
  @IsString()
  changeReason?: string;
}

export class TaskStatusDto {
  @ApiProperty({ enum: taskStatuses })
  @IsIn(taskStatuses)
  status!: typeof taskStatuses[number];

  @ApiPropertyOptional({ example: 'รอเอกสารจากลูกค้า', type: String })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TaskCommentDto {
  @ApiProperty({ example: 'โทรแจ้งลูกค้าแล้ว รอส่งรูปหน้างาน', type: String })
  @IsString()
  note!: string;
}
