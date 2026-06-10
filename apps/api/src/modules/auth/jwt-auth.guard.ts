import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators';
import { AuthService } from './auth.service';

/**
 * Глобальный guard: парсит access_token из cookie и кладёт req.user.
 * На @Public-роутах пропускает без токена (user остаётся null —
 * но если cookie есть, user всё равно подцепляется, например для isFavorite).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest();
    const token: string | undefined = req.cookies?.access_token;
    if (token) {
      try {
        const payload = this.auth.verifyAccess(token);
        req.user = { id: payload.sub, role: payload.role, displayName: payload.name };
      } catch {
        req.user = null;
      }
    }
    if (isPublic) return true;
    if (!req.user) throw new UnauthorizedException();
    return true;
  }
}
