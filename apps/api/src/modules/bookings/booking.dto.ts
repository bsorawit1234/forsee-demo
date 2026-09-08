import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'GREASE_TRAP', type: String })
  @IsString()
  serviceCode!: string;

  @ApiProperty({ format: 'uuid', type: String })
  @IsUUID()
  customerSiteId!: string;

  @ApiProperty({ example: '2026-09-01', type: String })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  requestedDate!: string;

  @ApiProperty({ example: '09:00', type: String })
  @Matches(/^\d{2}:\d{2}$/)
  requestedStart!: string;

  @ApiProperty({ example: '11:30', type: String })
  @Matches(/^\d{2}:\d{2}$/)
  requestedEnd!: string;

  @ApiPropertyOptional({ example: 4, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  estimatedVolume?: number;

  @ApiPropertyOptional({ example: 'ลบ.ม.', type: String })
  @IsOptional()
  @IsString()
  volumeUnit?: string;

  @ApiPropertyOptional({ example: 'เข้าทางประตูฝั่งตะวันออก', type: String })
  @IsOptional()
  @IsString()
  customerNote?: string;
}

export class CreateOpsBookingDto extends CreateBookingDto {
  @ApiProperty({ format: 'uuid', type: String })
  @IsUUID()
  customerOrganizationId!: string;

  @ApiPropertyOptional({ example: 'ADMIN_PHONE', enum: ['ADMIN_PHONE', 'ADMIN_MANUAL'] })
  @IsOptional()
  @IsEnum(['ADMIN_PHONE', 'ADMIN_MANUAL'])
  source?: 'ADMIN_PHONE' | 'ADMIN_MANUAL';

  @ApiPropertyOptional({ example: 'ลูกค้าโทรยืนยันกับคุณเอ', type: String })
  @IsOptional()
  @IsString()
  internalNote?: string;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @ApiPropertyOptional({ example: 'คุณเอ', type: String })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ example: '0812345678', type: String })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  confirmImmediately?: boolean;
}

export class UpdateBookingDto {
  @ApiProperty({ example: 1, type: Number })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ example: 'GREASE_TRAP', type: String })
  @IsOptional()
  @IsString()
  serviceCode?: string;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  customerSiteId?: string;

  @ApiPropertyOptional({ example: '2026-09-10', type: String })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  requestedDate?: string;

  @ApiPropertyOptional({ example: '10:00', type: String })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  requestedStart?: string;

  @ApiPropertyOptional({ example: '12:30', type: String })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  requestedEnd?: string;

  @ApiPropertyOptional({ example: 10, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  estimatedVolume?: number;

  @ApiPropertyOptional({ example: 'ลบ.ม.', type: String })
  @IsOptional()
  @IsString()
  volumeUnit?: string;

  @ApiPropertyOptional({ example: 'เข้าทางประตู 2', type: String })
  @IsOptional()
  @IsString()
  customerNote?: string;

  @ApiPropertyOptional({ example: 'โทรยืนยันแล้ว ลูกค้าขอเลื่อนเวลา', type: String })
  @IsOptional()
  @IsString()
  internalNote?: string;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @ApiProperty({ example: 'ลูกค้าขอเลื่อนเวลาและเพิ่มปริมาณ', type: String })
  @IsString()
  changeReason!: string;

  @ApiPropertyOptional({ example: 'UNASSIGN_IF_INVALID', enum: ['UNASSIGN_IF_INVALID', 'CANCEL_EDIT'] })
  @IsOptional()
  @IsEnum(['UNASSIGN_IF_INVALID', 'CANCEL_EDIT'])
  assignmentResolution?: 'UNASSIGN_IF_INVALID' | 'CANCEL_EDIT';

  @ApiPropertyOptional({ example: false, type: Boolean })
  @IsOptional()
  @IsBoolean()
  override?: boolean;
}

export class BookingActionDto {
  @ApiProperty({ example: 'ลูกค้าขอยกเลิกทางโทรศัพท์', type: String })
  @IsString()
  reason!: string;
}

export class BookingListQueryDto {
  @ApiPropertyOptional({ example: '2026-09-01T00:00:00+07:00', type: String })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30T00:00:00+07:00', type: String })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 'PENDING_CONFIRMATION', type: String })
  @IsOptional()
  @IsString()
  status?: string;
}

export class AssignBookingDto {
  @ApiProperty({ format: 'uuid', type: String })
  @IsUUID()
  vehicleId!: string;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  driverUserId?: string;

  @ApiPropertyOptional({ example: 'รถคันเดิมเข้าซ่อม', type: String })
  @IsOptional()
  @IsString()
  reason?: string;
}
