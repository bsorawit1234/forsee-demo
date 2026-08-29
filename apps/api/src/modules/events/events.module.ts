import { Global, Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventBus } from './event-bus.js';
import { AuthModule } from '../auth/auth.module.js';

@Global()
@Module({ imports: [AuthModule], controllers: [EventsController], providers: [EventBus], exports: [EventBus] })
export class EventsModule {}
