import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Roles } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LifecycleService } from '../auction-engine/lifecycle.service';
import { lotToDto, photoToDto } from '../lots/lot.mapper';
import { SettingsService } from '../settings/settings.service';
import { MediaService } from './media.service';

class LotFormDto {
  @IsString() @IsNotEmpty() make!: string;
  @IsOptional() @IsString() family?: string;
  @IsString() @IsNotEmpty() model!: string;
  @IsInt() year!: number;
  @IsInt() @Min(0) mileage!: number;
  @IsString() engine!: string;
  @IsInt() power!: number;
  @IsString() fuel!: string;
  @IsString() transmission!: string;
  @IsString() drive!: string;
  @IsString() body!: string;
  @IsString() color!: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() options?: string[];
  @IsInt() @Min(1) startPrice!: number;
  @IsInt() @Min(1) reservePrice!: number;
  @IsOptional() @IsInt() @Min(1) bidStep?: number | null;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsObject() autoteka?: Record<string, unknown>;
  @IsOptional() @IsBoolean() published?: boolean;
}

@Roles('manager', 'admin')
@Controller('admin/lots')
export class AdminLotsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly lifecycle: LifecycleService,
    private readonly media: MediaService,
  ) {}

  @Get()
  async list(@Query('filter') filter = 'all') {
    const where: Prisma.LotWhereInput =
      filter === 'draft'
        ? { published: false }
        : filter === 'live'
          ? { status: 'live' }
          : filter === 'soon'
            ? { status: 'upcoming' }
            : filter === 'done'
              ? { status: { in: ['sold', 'finished', 'withdrawn'] } }
              : {};
    const lots = await this.prisma.lot.findMany({
      where,
      include: { photos: true },
      orderBy: { createdAt: 'desc' },
    });
    const step = await this.settings.defaultBidStep();
    return lots.map((l) => ({ ...lotToDto(l, step), published: l.published, lotBidStep: l.bidStep != null ? Number(l.bidStep) : null }));
  }

  @Get(':id')
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUnique({ where: { id }, include: { photos: true } });
    if (!lot) throw new NotFoundException();
    const step = await this.settings.defaultBidStep();
    return { ...lotToDto(lot, step), published: lot.published, lotBidStep: lot.bidStep != null ? Number(lot.bidStep) : null };
  }

  @Post()
  async create(@Body() dto: LotFormDto) {
    const lot = await this.prisma.lot.create({ data: this.toData(dto) });
    if (lot.published && lot.status === 'upcoming') await this.scheduleJobs(lot.id);
    return { id: lot.id };
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LotFormDto) {
    const existing = await this.prisma.lot.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();
    const data = this.toData(dto, existing.status !== 'draft');
    const lot = await this.prisma.lot.update({ where: { id }, data });
    if (lot.published && ['upcoming', 'live'].includes(lot.status)) await this.scheduleJobs(lot.id);
    if (!lot.published) await this.lifecycle.cancelJobs(lot.id);
    return { id: lot.id };
  }

  /** Публикация черновика: появляется в каталоге, ставятся джобы открытия/закрытия. */
  @Post(':id/publish')
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException();
    const updated = await this.prisma.lot.update({
      where: { id },
      data: { published: true, status: lot.status === 'draft' ? 'upcoming' : lot.status },
    });
    await this.scheduleJobs(updated.id);
    return { id: updated.id, status: updated.status };
  }

  /** Перевыставление завершённого лота — новый лот с новыми датами. */
  @Post(':id/relist')
  async relist(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LotFormDto) {
    const src = await this.prisma.lot.findUnique({ where: { id }, include: { photos: true } });
    if (!src) throw new NotFoundException();
    const lot = await this.prisma.lot.create({
      data: {
        ...this.toData(dto),
        relistedFromLotId: src.id,
        photos: {
          create: src.photos.map((p) => ({ objectKey: p.objectKey, externalUrl: p.externalUrl, sort: p.sort })),
        },
      },
    });
    if (lot.published) await this.scheduleJobs(lot.id);
    return { id: lot.id };
  }

  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('files', 25, { limits: { fileSize: 15 * 1024 * 1024 } }))
  async uploadPhotos(@Param('id', ParseUUIDPipe) id: string, @UploadedFiles() files: Express.Multer.File[]) {
    const lot = await this.prisma.lot.findUnique({ where: { id }, include: { photos: true } });
    if (!lot) throw new NotFoundException();
    let sort = lot.photos.reduce((m, p) => Math.max(m, p.sort + 1), 0);
    const created = [];
    for (const f of files ?? []) {
      const key = await this.media.uploadLotPhoto(id, f.buffer);
      created.push(await this.prisma.lotPhoto.create({ data: { lotId: id, objectKey: key, sort: sort++ } }));
    }
    return created.map(photoToDto);
  }

  @Delete(':id/photos/:photoId')
  async deletePhoto(@Param('id', ParseUUIDPipe) id: string, @Param('photoId', ParseUUIDPipe) photoId: string) {
    const photo = await this.prisma.lotPhoto.findFirst({ where: { id: photoId, lotId: id } });
    if (!photo) throw new NotFoundException();
    if (photo.objectKey) await this.media.deleteLotPhoto(photo.objectKey);
    await this.prisma.lotPhoto.delete({ where: { id: photoId } });
    return { ok: true };
  }

  private toData(dto: LotFormDto, keepStatus = false): Prisma.LotUncheckedCreateInput {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    return {
      make: dto.make,
      family: dto.family ?? dto.model.split(' ')[0],
      model: dto.model,
      year: dto.year,
      mileage: dto.mileage,
      engine: dto.engine,
      power: dto.power,
      fuel: dto.fuel,
      transmission: dto.transmission,
      drive: dto.drive,
      body: dto.body,
      color: dto.color,
      vin: dto.vin ?? null,
      description: dto.description ?? '',
      options: dto.options ?? [],
      startPrice: BigInt(dto.startPrice),
      reservePrice: BigInt(dto.reservePrice),
      bidStep: dto.bidStep != null ? BigInt(dto.bidStep) : null,
      currentPrice: BigInt(dto.startPrice),
      startsAt,
      endsAt,
      originalEndsAt: endsAt,
      autoteka: (dto.autoteka as Prisma.InputJsonObject) ?? undefined,
      published: dto.published ?? false,
      ...(keepStatus ? {} : { status: dto.published ? 'upcoming' : 'draft' }),
    };
  }

  private async scheduleJobs(lotId: string): Promise<void> {
    const lot = await this.prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
    if (lot.status === 'upcoming') await this.lifecycle.scheduleOpen(lotId, lot.startsAt);
    if (['upcoming', 'live'].includes(lot.status)) await this.lifecycle.scheduleClose(lotId, lot.endsAt);
  }
}
