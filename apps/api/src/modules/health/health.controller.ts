import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('/health/live')
  live() {
    return { status: 'ok', service: 'forsee-api', timestamp: new Date().toISOString() };
  }

  @Get('/health/ready')
  ready() {
    return { status: 'ok', service: 'forsee-api', dependencies: { database: 'pending' } };
  }
}
