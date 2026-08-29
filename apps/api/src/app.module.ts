import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { BookingModule } from './modules/bookings/booking.module.js';
import { OperationsModule } from './modules/operations/operations.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { HealthController } from './modules/health/health.controller.js';
import { CommonModule } from './common/common.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, CommonModule, AuthModule, CatalogModule, BookingModule, OperationsModule, EventsModule],
  controllers: [HealthController],
})
export class AppModule {}
