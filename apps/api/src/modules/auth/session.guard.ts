import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest, SessionUser } from '../../common/request-user.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.session as string | undefined;
    if (!token) throw new UnauthorizedException('ต้องเข้าสู่ระบบก่อน');
    try {
      request.user = await this.jwt.verifyAsync<SessionUser>(token, { secret: process.env.SESSION_SECRET ?? 'local-only-session-secret' });
      return true;
    } catch {
      throw new UnauthorizedException('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
  }
}
