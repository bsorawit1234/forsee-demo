import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';
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

  @ApiPropertyOptional({ example: 'เข้าทางประตูฝั่งตะวันออก', type: String })
  @IsOptional()
  @IsString()
  customerNote?: string;
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
