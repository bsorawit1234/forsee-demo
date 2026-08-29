import { scryptSync, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service.js';
import type { SessionUser } from '../../common/request-user.js';
import type { LoginDto } from './auth.dto.js';

function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith('scrypt$')) return false;
  const [, salt, expectedHex] = stored.split('$');
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, expectedHex.length / 2);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() }, include: { memberships: { include: { organization: true } } } });
    if (!user || user.status !== 'ACTIVE' || !verifyPassword(dto.password, user.passwordHash)) throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('ผู้ใช้นี้ยังไม่ได้ผูกกับองค์กร');
    const session: SessionUser = { id: user.id, email: user.email, displayName: user.displayName, organizationId: membership.organizationId, organizationType: membership.organization.type, role: membership.role };
    const token = await this.jwt.signAsync(session, { secret: process.env.SESSION_SECRET ?? 'local-only-session-secret', expiresIn: '8h' });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { token, user: session };
  }
}
