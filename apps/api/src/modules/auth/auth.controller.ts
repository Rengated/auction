import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString } from 'class-validator';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { mergeNotificationPrefs, type MeDto } from '@hermes/shared';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { AuthService } from './auth.service';
import { YandexService } from './yandex.service';

class LoginDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsString() @IsNotEmpty() password!: string;
}

function clientOrigin(target: string | undefined): string {
  return target === 'admin'
    ? (process.env.ADMIN_ORIGIN ?? 'http://localhost:5174')
    : (process.env.WEB_ORIGIN ?? 'http://localhost:5173');
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly yandex: YandexService,
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  /** Старт OAuth-флоу. ?target=web|admin определяет, куда вернуть после входа. */
  @Public()
  @Get('yandex')
  startOauth(@Query('target') target: string | undefined, @Res() res: Response) {
    if (!this.yandex.configured) {
      throw new BadRequestException('Yandex OAuth не сконфигурирован');
    }
    const nonce = randomBytes(16).toString('hex');
    const state = `${nonce}:${target === 'admin' ? 'admin' : 'web'}`;
    res.cookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 10 * 60_000,
      path: '/',
    });
    return res.redirect(this.yandex.authorizeUrl(state));
  }

  @Public()
  @Get('yandex/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const saved = req.cookies?.oauth_state;
    if (!saved || saved !== state) throw new UnauthorizedException('Bad OAuth state');
    res.clearCookie('oauth_state', { path: '/', domain: process.env.COOKIE_DOMAIN || undefined });
    const target = state.endsWith(':admin') ? 'admin' : 'web';
    const profile = await this.yandex.exchangeCode(code);
    const user = await this.auth.upsertFromYandex(profile);
    await this.auth.issueSession(user, res, req.headers['user-agent'], 'buyer');
    return res.redirect(clientOrigin(target));
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    // Аудитория определяется по тому, какая refresh-кука пришла (staff_* → персонал).
    const staffToken = req.cookies?.staff_refresh;
    const token = staffToken ?? req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();
    await this.auth.refreshSession(token, res, req.headers['user-agent'], staffToken ? 'staff' : 'buyer');
    return res.json({ ok: true });
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const staffToken = req.cookies?.staff_refresh;
    await this.auth.logout(staffToken ?? req.cookies?.refresh_token, res, staffToken ? 'staff' : 'buyer');
    return res.json({ ok: true });
  }

  /** Вход персонала (admin/manager) по логину и паролю. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res() res: Response) {
    const userAgent = req.headers['user-agent'];
    let user;
    try {
      user = await this.auth.verifyPassword(dto.username, dto.password);
    } catch (e) {
      void this.telegram.notifyStaffLogin({ ok: false, username: dto.username, ip: req.ip, userAgent });
      throw e;
    }
    await this.auth.issueSession(user, res, userAgent, 'staff');
    void this.telegram.notifyStaffLogin({ ok: true, username: dto.username, role: user.role, ip: req.ip, userAgent });
    return res.json({ ok: true });
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<MeDto> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user!.id } });
    return {
      id: u.id,
      role: u.role,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      contactsFilled: Boolean(u.fullName && u.phone && u.email),
      contacts: { fullName: u.fullName, phone: u.phone, email: u.email },
      blockedUntil: u.blockedUntil && u.blockedUntil > new Date() ? u.blockedUntil.toISOString() : null,
      blockReason: u.blockedUntil && u.blockedUntil > new Date() ? u.blockReason : null,
      notificationPrefs: mergeNotificationPrefs(u.notificationPrefs),
    };
  }
}
