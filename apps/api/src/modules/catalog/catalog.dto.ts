import { IsOptional, IsString, Matches, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-09-01', type: String })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ example: 'GREASE_TRAP', type: String })
  @IsString()
  serviceCode!: string;

  @ApiPropertyOptional({ format: 'uuid', type: String })
  @IsOptional()
  @IsUUID()
  customerSiteId?: string;
}
