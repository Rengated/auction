import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import type { Role, User } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_SEC = 30 * 24 * 3600;

/** Аудитория токена: покупатель (Яндекс, осн. сайт) или персонал (логин/пароль, админка). */
export type Audience = 'buyer' | 'staff';

export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
  aud: Audience;
}

/** Имена кук по аудитории. Staff-куки host-only (только admin-домен), buyer — общий домен. */
const COOKIE_NAMES: Record<Audience, { access: string; refresh: string }> = {
  buyer: { access: 'access_token', refresh: 'refresh_token' },
  staff: { access: 'staff_access', refresh: 'staff_refresh' },
};

export interface YandexProfile {
  yandexId: string;
  displayName: string;
  fullName: string | null;
  phone: string | null;
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
    // При первом входе предзаполняем контакты данными из Яндекса (имя/телефон/email).
    // Если Яндекс дал и имя, и телефон — сразу считаем контакты заполненными
    // (покупатель может участвовать в торгах без формы; поправит позже в профиле).
    // При повторном входе контакты не трогаем (юзер мог их изменить).
    const contactsReady = Boolean(profile.fullName && profile.phone && profile.email);
    return this.prisma.user.upsert({
      where: { yandexId: profile.yandexId },
      create: {
        yandexId: profile.yandexId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        email: profile.email,
        fullName: profile.fullName,
        phone: profile.phone,
        contactsFilledAt: contactsReady ? new Date() : null,
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

  /** Хэш пароля для персонала (admin/manager). */
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /** Вход персонала по username+паролю. */
  async verifyPassword(username: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Неверный логин или пароль');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный логин или пароль');
    if (user.archivedAt) throw new UnauthorizedException('Аккаунт архивирован — обратитесь к администратору');
    return user;
  }

  async issueSession(user: User, res: Response, userAgent: string | undefined, audience: Audience): Promise<void> {
    const access = await this.jwt.signAsync(
      { sub: user.id, role: user.role, name: user.displayName, aud: audience } satisfies JwtPayload,
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
    this.setCookies(res, access, refresh, audience);
  }

  /** Домен куки: buyer — общий (.DOMAIN, для OAuth-callback), staff — host-only (только админ-домен). */
  private cookieDomain(audience: Audience): string | undefined {
    return audience === 'buyer' ? process.env.COOKIE_DOMAIN || undefined : undefined;
  }

  private setCookies(res: Response, access: string, refresh: string, audience: Audience): void {
    const secure = process.env.NODE_ENV === 'production';
    const domain = this.cookieDomain(audience);
    const names = COOKIE_NAMES[audience];
    res.cookie(names.access, access, { httpOnly: true, sameSite: 'lax', secure, domain, maxAge: ACCESS_TTL_SEC * 1000, path: '/' });
    res.cookie(names.refresh, refresh, { httpOnly: true, sameSite: 'lax', secure, domain, maxAge: REFRESH_TTL_SEC * 1000, path: '/' });
  }

  /** Ротация refresh-токена: старый отзывается, выдаётся новая пара (в той же аудитории). */
  async refreshSession(refreshToken: string, res: Response, userAgent: string | undefined, audience: Audience): Promise<User> {
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.hash(refreshToken), revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!row) throw new UnauthorizedException('Invalid refresh token');
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    await this.issueSession(row.user, res, userAgent, audience);
    return row.user;
  }

  async logout(refreshToken: string | undefined, res: Response, audience: Audience): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hash(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    const domain = this.cookieDomain(audience);
    const names = COOKIE_NAMES[audience];
    res.clearCookie(names.access, { path: '/', domain });
    res.clearCookie(names.refresh, { path: '/', domain });
  }

  verifyAccess(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token);
  }
}
