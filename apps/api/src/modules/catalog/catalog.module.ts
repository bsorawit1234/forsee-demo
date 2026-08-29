import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({ imports: [AuthModule], controllers: [CatalogController] })
export class CatalogModule {}
