import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

class ContactsDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

@Controller('me')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Patch('contacts')
  async updateContacts(@CurrentUser() user: AuthUser, @Body() dto: ContactsDto) {
    await this.prisma.user.update({
      where: { id: user!.id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email ?? undefined,
        city: dto.city ?? undefined,
        contactsFilledAt: new Date(),
      },
    });
    return { ok: true };
  }

  @Get('notifications')
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.listFor(user!.id);
  }

  @Post('notifications/read')
  async read(@CurrentUser() user: AuthUser) {
    await this.notifications.markAllRead(user!.id);
    return { ok: true };
  }
}
