import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import type { Response } from 'express';
import type { Role, User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_SEC = 30 * 24 * 3600;

export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
}

export interface YandexProfile {
  yandexId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async upsertFromYandex(profile: YandexProfile): Promise<User> {
    return this.prisma.user.upsert({
      where: { yandexId: profile.yandexId },
      create: {
        yandexId: profile.yandexId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        email: profile.email,
      },
      update: {
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
    });
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issueSession(user: User, res: Response, userAgent?: string): Promise<void> {
    const access = await this.jwt.signAsync(
      { sub: user.id, role: user.role, name: user.displayName } satisfies JwtPayload,
      { expiresIn: ACCESS_TTL_SEC },
    );
    const refresh = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refresh),
        userAgent: userAgent ?? null,
        expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
      },
    });
    this.setCookies(res, access, refresh);
  }

  private setCookies(res: Response, access: string, refresh: string): void {
    const secure = process.env.NODE_ENV === 'production';
    res.cookie('access_token', access, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: ACCESS_TTL_SEC * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refresh, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: REFRESH_TTL_SEC * 1000,
      path: '/auth',
    });
  }

  /** Ротация refresh-токена: старый отзывается, выдаётся новая пара. */
  async refreshSession(refreshToken: string, res: Response, userAgent?: string): Promise<User> {
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.hash(refreshToken), revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!row) throw new UnauthorizedException('Invalid refresh token');
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    await this.issueSession(row.user, res, userAgent);
    return row.user;
  }

  async logout(refreshToken: string | undefined, res: Response): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hash(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth' });
  }

  verifyAccess(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token);
  }
}
