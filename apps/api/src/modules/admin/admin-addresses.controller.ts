import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { AddressDto } from '@hermes/shared';
import { Roles, STAFF } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

class AddressInput {
  @IsString() @IsNotEmpty() label!: string;
  @IsString() @IsNotEmpty() fullAddress!: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsInt() sortOrder?: number;
}

/** Справочник адресов (точек осмотра/выдачи) — заполняется заранее, выбирается на лоте. */
@Roles(...STAFF)
@Controller('admin/addresses')
export class AdminAddressesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(): Promise<AddressDto[]> {
    const rows = await this.prisma.address.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((a) => ({
      id: a.id,
      label: a.label,
      fullAddress: a.fullAddress,
      city: a.city,
      sortOrder: a.sortOrder,
    }));
  }

  @Post()
  async create(@Body() dto: AddressInput) {
    const a = await this.prisma.address.create({
      data: {
        label: dto.label,
        fullAddress: dto.fullAddress,
        city: dto.city ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    return { id: a.id };
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    // FK на лотах с onDelete: SetNull — снимок addressText у лотов сохранится
    await this.prisma.address.delete({ where: { id } });
    return { ok: true };
  }
}
