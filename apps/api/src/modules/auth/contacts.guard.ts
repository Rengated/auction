import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@hermes/shared';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Для участия в торгах нужны заполненные контакты и отсутствие блокировки. */
@Injectable()
export class ContactsFilledGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const reqUser = ctx.switchToHttp().getRequest().user;
    if (!reqUser) return false;
    const user = await this.prisma.user.findUnique({ where: { id: reqUser.id } });
    if (!user) return false;
    if (user.blockedUntil && user.blockedUntil > new Date()) {
      throw new ApiError(ERROR_CODES.USER_BLOCKED, 'Доступ к торгам ограничен', HttpStatus.FORBIDDEN, {
        until: user.blockedUntil.toISOString(),
        reason: user.blockReason,
      });
    }
    if (!user.contactsFilledAt) {
      throw new ApiError(
        ERROR_CODES.CONTACTS_REQUIRED,
        'Заполните личные данные для участия в торгах',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
  }
}
