import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';
import { RolesGuard } from './roles.guard.js';

@Module({ imports: [JwtModule.register({})], controllers: [AuthController], providers: [AuthService, SessionGuard, RolesGuard], exports: [AuthService, SessionGuard, RolesGuard, JwtModule] })
export class AuthModule {}
