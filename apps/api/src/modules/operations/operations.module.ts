import { Module } from '@nestjs/common';
import { BookingModule } from '../bookings/booking.module.js';
import { OperationsController } from './operations.controller.js';

@Module({ imports: [BookingModule], controllers: [OperationsController] })
export class OperationsModule {}
