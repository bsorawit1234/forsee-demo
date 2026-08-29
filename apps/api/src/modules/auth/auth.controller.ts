import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../common/request-user.js';
import { LoginDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto);
    response.cookie('session', result.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 });
    return { user: result.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('session');
    return { ok: true };
  }

  @Get('me')
  @ApiCookieAuth('session')
  @UseGuards(SessionGuard)
  me(@Req() request: AuthenticatedRequest) { return { user: request.user }; }
}
