import { Global, Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { EventBus } from './event-bus.js';

@Global()
@Module({ controllers: [EventsController], providers: [EventBus], exports: [EventBus] })
export class EventsModule {}
