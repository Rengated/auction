import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ERROR_CODES } from '@hermes/shared';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertNotBlocked } from './not-blocked.guard';

/** Для участия в торгах нужны заполненные контакты и отсутствие блокировки. */
@Injectable()
export class ContactsFilledGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const reqUser = ctx.switchToHttp().getRequest().user;
    if (!reqUser) return false;
    await assertNotBlocked(this.prisma, reqUser.id);
    const user = await this.prisma.user.findUnique({ where: { id: reqUser.id } });
    if (!user) return false;
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
