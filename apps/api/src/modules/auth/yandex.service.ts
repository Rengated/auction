import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { YandexProfile } from './auth.service';

/** Обмен authorization code → профиль Яндекс ID. */
@Injectable()
export class YandexService {
  get configured(): boolean {
    return Boolean(process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET);
  }

  get devFake(): boolean {
    return process.env.AUTH_DEV_FAKE === '1';
  }

  /** Точный redirect_uri — должен совпадать в authorize и token и в настройках приложения. */
  callbackUrl(): string {
    const api = (process.env.API_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${api}/auth/yandex/callback`;
  }

  authorizeUrl(state: string): string {
    const u = new URL('https://oauth.yandex.ru/authorize');
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('client_id', process.env.YANDEX_CLIENT_ID!);
    u.searchParams.set('redirect_uri', this.callbackUrl());
    // Запрашиваем номер телефона для предзаполнения контактов (нужен доступ в приложении)
    u.searchParams.set('scope', 'login:info login:email login:avatar login:default_phone');
    u.searchParams.set('state', state);
    return u.toString();
  }

  async exchangeCode(code: string): Promise<YandexProfile> {
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.YANDEX_CLIENT_ID!,
        client_secret: process.env.YANDEX_CLIENT_SECRET!,
        redirect_uri: this.callbackUrl(),
      }),
    });
    if (!tokenRes.ok) throw new UnauthorizedException('Yandex token exchange failed');
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const infoRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${access_token}` },
    });
    if (!infoRes.ok) throw new UnauthorizedException('Yandex profile fetch failed');
    const info = (await infoRes.json()) as {
      id: string;
      display_name?: string;
      real_name?: string;
      first_name?: string;
      last_name?: string;
      login?: string;
      default_email?: string;
      is_avatar_empty?: boolean;
      default_avatar_id?: string;
      default_phone?: { number?: string } | null;
    };
    // ФИО для предзаполнения контактов: реальное имя приоритетнее ника
    const fullName =
      info.real_name ||
      [info.first_name, info.last_name].filter(Boolean).join(' ') ||
      info.display_name ||
      null;
    return {
      yandexId: info.id,
      displayName: info.display_name || info.real_name || info.login || 'Пользователь',
      fullName: fullName || null,
      phone: info.default_phone?.number ?? null,
      avatarUrl:
        info.default_avatar_id && !info.is_avatar_empty
          ? `https://avatars.yandex.net/get-yapic/${info.default_avatar_id}/islands-200`
          : null,
      email: info.default_email ?? null,
    };
  }
}
