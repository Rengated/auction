import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { mergeNotificationPrefs, type MeDto } from '@hermes/shared';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from './auth.service';
import { YandexService } from './yandex.service';

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
  ) {}

  /** Старт OAuth-флоу. ?target=web|admin определяет, куда вернуть после входа. */
  @Public()
  @Get('yandex')
  startOauth(@Query('target') target: string | undefined, @Res() res: Response) {
    if (!this.yandex.configured) {
      // относительный редирект: в проде API живёт за префиксом /api
      if (this.yandex.devFake) return res.redirect(`dev?target=${target ?? 'web'}`);
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
    await this.auth.issueSession(user, res, req.headers['user-agent']);
    return res.redirect(clientOrigin(target));
  }

  /** Dev-вход без Яндекса: страница выбора пользователя из сидов. */
  @Public()
  @Get('dev')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async devPage(@Query('target') target: string | undefined) {
    if (!this.yandex.devFake) throw new BadRequestException('Dev-вход выключен');
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' }, take: 20 });
    const rows = users
      .map(
        (u) =>
          `<li><a href="dev/login?as=${encodeURIComponent(u.yandexId)}&target=${target ?? 'web'}">` +
          `${u.displayName} <small>(${u.yandexId}, ${u.role})</small></a></li>`,
      )
      .join('\n');
    return `<!doctype html><meta charset="utf-8"><title>Dev-вход</title>
      <body style="font:15px/1.6 system-ui;max-width:480px;margin:48px auto">
      <h2>Dev-вход (Яндекс OAuth не сконфигурирован)</h2><ul>${rows}</ul></body>`;
  }

  @Public()
  @Get('dev/login')
  async devLogin(
    @Query('as') as_: string,
    @Query('target') target: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!this.yandex.devFake) throw new BadRequestException('Dev-вход выключен');
    const user = await this.prisma.user.findUnique({ where: { yandexId: as_ } });
    if (!user) throw new UnauthorizedException('Нет такого dev-пользователя');
    await this.auth.issueSession(user, res, req.headers['user-agent']);
    return res.redirect(clientOrigin(target));
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refresh_token;
    if (!token) throw new UnauthorizedException();
    await this.auth.refreshSession(token, res, req.headers['user-agent']);
    return res.json({ ok: true });
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    await this.auth.logout(req.cookies?.refresh_token, res);
    return res.json({ ok: true });
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<MeDto> {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user!.id } });
    return {
      id: u.id,
      role: u.role,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      contactsFilled: Boolean(u.contactsFilledAt),
      contacts: { fullName: u.fullName, phone: u.phone, email: u.email },
      blockedUntil: u.blockedUntil && u.blockedUntil > new Date() ? u.blockedUntil.toISOString() : null,
      blockReason: u.blockedUntil && u.blockedUntil > new Date() ? u.blockReason : null,
      notificationPrefs: mergeNotificationPrefs(u.notificationPrefs),
    };
  }
}
