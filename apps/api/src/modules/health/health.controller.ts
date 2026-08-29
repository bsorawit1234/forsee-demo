import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service.js';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/health/live')
  live() {
    return { status: 'ok', service: 'forsee-api', timestamp: new Date().toISOString() };
  }

  @Get('/health/ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'forsee-api', dependencies: { database: 'ok' } };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded', service: 'forsee-api', dependencies: { database: 'down' } });
    }
  }
}
