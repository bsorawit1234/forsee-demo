import { Module } from '@nestjs/common';
import { BookingModule } from '../bookings/booking.module.js';
import { OperationsController } from './operations.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({ imports: [BookingModule, AuthModule], controllers: [OperationsController] })
export class OperationsModule {}
