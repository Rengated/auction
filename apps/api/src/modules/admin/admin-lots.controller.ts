import {
  BadRequestException,
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
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Prisma } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { WS_EVENTS } from '@hermes/shared';
import { Roles } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LifecycleService } from '../auction-engine/lifecycle.service';
import { autotekaPdfUrl, lotToDto, lotToTick, photoToDto } from '../lots/lot.mapper';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from '../telegram/telegram.service';
import { MediaService } from './media.service';

const MAX_MEDIA_PER_LOT = 50;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

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
  /** Комиссия лота как доля (0.015 = 1.5%); null/не задано → глобальная */
  @IsOptional() @IsNumber() @Min(0) @Max(1) feeRate?: number | null;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
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
    private readonly realtime: RealtimeService,
    private readonly telegram: TelegramService,
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
    const defaults = await this.settings.lotDefaults();
    return lots.map((l) => this.toAdminDto(l, defaults));
  }

  @Get(':id')
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUnique({ where: { id }, include: { photos: true } });
    if (!lot) throw new NotFoundException();
    const defaults = await this.settings.lotDefaults();
    return this.toAdminDto(lot, defaults);
  }

  @Post()
  async create(@Body() dto: LotFormDto) {
    if (dto.published) this.assertFutureDates(dto);
    const lot = await this.prisma.lot.create({ data: this.toCreateData(dto) });
    if (lot.published && lot.status === 'upcoming') {
      await this.scheduleJobs(lot.id);
      void this.telegram.announceLot('published', lot.id);
    }
    return { id: lot.id };
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LotFormDto) {
    const existing = await this.prisma.lot.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();

    // Публикация черновика через сохранение формы — те же проверки дат, что и в publish()
    const publishing = !existing.published && dto.published === true;
    if (publishing && ['draft', 'upcoming'].includes(existing.status)) this.assertFutureDates(dto);
    // Снятие с публикации до старта без ставок — честный возврат в черновик
    const revertToDraft =
      existing.published && dto.published === false && existing.status === 'upcoming' && existing.bidCount === 0;

    const lot = await this.prisma.lot.update({
      where: { id },
      data: this.toUpdateData(dto, existing, revertToDraft ? 'draft' : undefined),
    });
    if (lot.published && ['upcoming', 'live'].includes(lot.status)) await this.scheduleJobs(lot.id);
    if (!lot.published) await this.lifecycle.cancelJobs(lot.id);
    if (revertToDraft) {
      await this.prisma.auctionEvent.create({ data: { lotId: id, type: 'unpublished', payload: {} } });
      // Каталог покупателя по LOT_STATUS перезапрашивает список — лот исчезает без перезагрузки
      const event = { lot: lotToTick(lot) };
      this.realtime.toLot(id, WS_EVENTS.LOT_STATUS, event);
      this.realtime.toCatalog(WS_EVENTS.LOT_STATUS, event);
      this.realtime.toAdmin(WS_EVENTS.LOT_STATUS, event);
    }
    if (publishing && lot.published && lot.status === 'upcoming') {
      void this.telegram.announceLot('published', lot.id);
    }
    return { id: lot.id };
  }

  /** Публикация черновика: появляется в каталоге, ставятся джобы открытия/закрытия. */
  @Post(':id/publish')
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException();
    if (lot.status === 'draft' || lot.status === 'upcoming') {
      this.assertFutureDates({ startsAt: lot.startsAt.toISOString(), endsAt: lot.endsAt.toISOString() });
    }
    const updated = await this.prisma.lot.update({
      where: { id },
      data: { published: true, status: lot.status === 'draft' ? 'upcoming' : lot.status },
    });
    await this.scheduleJobs(updated.id);
    if (updated.status === 'upcoming') void this.telegram.announceLot('published', updated.id);
    return { id: updated.id, status: updated.status };
  }

  /** Перевыставление завершённого лота — новый лот с новыми датами. */
  @Post(':id/relist')
  async relist(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LotFormDto) {
    const src = await this.prisma.lot.findUnique({ where: { id }, include: { photos: true } });
    if (!src) throw new NotFoundException();
    if (dto.published) this.assertFutureDates(dto);
    const lot = await this.prisma.lot.create({
      data: {
        ...this.toCreateData(dto),
        relistedFromLotId: src.id,
        autotekaPdfKey: src.autotekaPdfKey,
        photos: {
          create: src.photos.map((p) => ({ kind: p.kind, objectKey: p.objectKey, externalUrl: p.externalUrl, sort: p.sort })),
        },
      },
    });
    if (lot.published) {
      await this.scheduleJobs(lot.id);
      void this.telegram.announceLot('published', lot.id);
    }
    return { id: lot.id };
  }

  @Post(':id/photos')
  @UseInterceptors(FilesInterceptor('files', MAX_MEDIA_PER_LOT, { limits: { fileSize: MAX_VIDEO_BYTES } }))
  async uploadMedia(@Param('id', ParseUUIDPipe) id: string, @UploadedFiles() files: Express.Multer.File[]) {
    const lot = await this.prisma.lot.findUnique({ where: { id }, include: { photos: true } });
    if (!lot) throw new NotFoundException();
    const incoming = files ?? [];
    if (lot.photos.length + incoming.length > MAX_MEDIA_PER_LOT) {
      throw new BadRequestException(`Не более ${MAX_MEDIA_PER_LOT} фото и видео на лот`);
    }
    for (const f of incoming) {
      if (IMAGE_MIMES.has(f.mimetype)) {
        if (f.size > MAX_PHOTO_BYTES) throw new BadRequestException('Фото не больше 15 МБ');
      } else if (VIDEO_MIMES.has(f.mimetype)) {
        if (f.size > MAX_VIDEO_BYTES) throw new BadRequestException('Видео не больше 200 МБ');
      } else {
        throw new BadRequestException(`Неподдерживаемый формат: ${f.mimetype}`);
      }
    }
    let sort = lot.photos.reduce((m, p) => Math.max(m, p.sort + 1), 0);
    const created = [];
    for (const f of incoming) {
      const isVideo = VIDEO_MIMES.has(f.mimetype);
      const key = isVideo
        ? await this.media.uploadLotVideo(id, f.buffer, f.mimetype)
        : await this.media.uploadLotPhoto(id, f.buffer);
      created.push(
        await this.prisma.lotPhoto.create({
          data: { lotId: id, kind: isVideo ? 'video' : 'photo', objectKey: key, sort: sort++ },
        }),
      );
    }
    return created.map(photoToDto);
  }

  @Delete(':id/photos/:photoId')
  async deletePhoto(@Param('id', ParseUUIDPipe) id: string, @Param('photoId', ParseUUIDPipe) photoId: string) {
    const photo = await this.prisma.lotPhoto.findFirst({ where: { id: photoId, lotId: id } });
    if (!photo) throw new NotFoundException();
    if (photo.objectKey) {
      if (photo.kind === 'video') await this.media.deleteObject(photo.objectKey);
      else await this.media.deleteLotPhoto(photo.objectKey);
    }
    await this.prisma.lotPhoto.delete({ where: { id: photoId } });
    return { ok: true };
  }

  /** Отчёт Автотеки загружается администратором только как PDF-файл. */
  @Post(':id/autoteka')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadAutoteka(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
    const lot = await this.prisma.lot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException();
    if (!file || file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Нужен PDF-файл отчёта Автотеки');
    }
    if (lot.autotekaPdfKey) await this.media.deleteObject(lot.autotekaPdfKey);
    const key = await this.media.uploadAutotekaPdf(id, file.buffer);
    const updated = await this.prisma.lot.update({ where: { id }, data: { autotekaPdfKey: key } });
    return { autotekaPdfUrl: autotekaPdfUrl(updated) };
  }

  @Delete(':id/autoteka')
  async deleteAutoteka(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException();
    if (lot.autotekaPdfKey) await this.media.deleteObject(lot.autotekaPdfKey);
    await this.prisma.lot.update({ where: { id }, data: { autotekaPdfKey: null } });
    return { ok: true };
  }

  private toAdminDto(
    lot: Prisma.LotGetPayload<{ include: { photos: true } }>,
    defaults: { bidStep: number; feeRate: number },
  ) {
    return {
      ...lotToDto(lot, defaults),
      published: lot.published,
      lotBidStep: lot.bidStep != null ? Number(lot.bidStep) : null,
      lotFeeRate: lot.feeRate != null ? Number(lot.feeRate) : null,
    };
  }

  /** Публикация лота с прошедшими датами мгновенно «отыгрывает» его — запрещаем. */
  private assertFutureDates(dto: { startsAt: string; endsAt: string }): void {
    const now = Date.now();
    if (new Date(dto.startsAt).getTime() <= now) {
      throw new BadRequestException('Дата старта уже прошла — укажите новые даты торгов');
    }
    if (new Date(dto.endsAt).getTime() <= now) {
      throw new BadRequestException('Дата окончания уже прошла — укажите новые даты торгов');
    }
  }

  /** Общие поля формы (без торгового состояния). */
  private formFields(dto: LotFormDto) {
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
      feeRate: dto.feeRate ?? null,
      published: dto.published ?? false,
    };
  }

  private toCreateData(dto: LotFormDto): Prisma.LotUncheckedCreateInput {
    const endsAt = new Date(dto.endsAt);
    return {
      ...this.formFields(dto),
      currentPrice: BigInt(dto.startPrice),
      startsAt: new Date(dto.startsAt),
      endsAt,
      originalEndsAt: endsAt,
      status: dto.published ? 'upcoming' : 'draft',
    };
  }

  /** На update торговое состояние лота со ставками (цена, лидер) не трогаем. */
  private toUpdateData(
    dto: LotFormDto,
    existing: { bidCount: number; status: string },
    statusOverride?: 'draft',
  ): Prisma.LotUncheckedUpdateInput {
    const endsAt = new Date(dto.endsAt);
    const hasBids = existing.bidCount > 0;
    return {
      ...this.formFields(dto),
      startsAt: new Date(dto.startsAt),
      endsAt,
      ...(hasBids ? {} : { currentPrice: BigInt(dto.startPrice), originalEndsAt: endsAt }),
      ...(statusOverride
        ? { status: statusOverride }
        : existing.status === 'draft'
          ? { status: dto.published ? 'upcoming' : 'draft' }
          : {}),
    };
  }

  private async scheduleJobs(lotId: string): Promise<void> {
    const lot = await this.prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
    if (lot.status === 'upcoming') await this.lifecycle.scheduleOpen(lotId, lot.startsAt);
    if (['upcoming', 'live'].includes(lot.status)) await this.lifecycle.scheduleClose(lotId, lot.endsAt);
  }
}
