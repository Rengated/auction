import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@hermes/shared';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../common/prisma/prisma.service';

export async function assertNotBlocked(prisma: PrismaService, userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { blockedUntil: true, blockReason: true },
  });
  if (user?.blockedUntil && user.blockedUntil > new Date()) {
    throw new ApiError(ERROR_CODES.USER_BLOCKED, 'Доступ к торгам ограничен', HttpStatus.FORBIDDEN, {
      until: user.blockedUntil.toISOString(),
      reason: user.blockReason,
    });
  }
}

/** Заблокированный пользователь не выполняет действий на площадке (ставки, избранное). */
@Injectable()
export class NotBlockedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const reqUser = ctx.switchToHttp().getRequest().user;
    if (!reqUser) return false;
    await assertNotBlocked(this.prisma, reqUser.id);
    return true;
  }
}
