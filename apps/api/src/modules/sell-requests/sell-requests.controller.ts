import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContactsFilledGuard } from '../auth/contacts.guard';

class CreateSellRequestDto {
  @IsString()
  @IsNotEmpty()
  make!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsInt()
  @Min(1950)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(0)
  mileage!: number;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

@Controller('sell-requests')
export class SellRequestsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseGuards(ContactsFilledGuard)
  async create(@Body() dto: CreateSellRequestDto, @CurrentUser() user: AuthUser) {
    const row = await this.prisma.sellRequest.create({
      data: { ...dto, comment: dto.comment ?? '', userId: user!.id },
    });
    return { id: row.id, status: row.status };
  }
}
