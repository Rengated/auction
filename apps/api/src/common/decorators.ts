import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
/** Эндпоинт доступен без авторизации (но user подцепляется, если cookie есть). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  id: string;
  role: Role;
  displayName: string;
  /** Аудитория токена: 'buyer' (Яндекс, осн. сайт) или 'staff' (логин/пароль, админка). */
  aud: 'buyer' | 'staff';
}

/** Текущий пользователь из JWT (null на @Public-роутах без cookie). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser | null => {
  const req = ctx.switchToHttp().getRequest();
  return req.user ?? null;
});
