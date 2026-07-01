import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
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
import { Prisma, type DealStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PAGE_LIMITS, WS_EVENTS, type AutotekaReportDto } from '@hermes/shared';
import { CurrentUser, Roles, STAFF, type AuthUser } from '../../common/decorators';
import { PageQueryDto } from '../../common/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LifecycleService } from '../auction-engine/lifecycle.service';
import { autotekaPdfUrl, lotToDto, lotToTick, photoToDto } from '../lots/lot.mapper';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from '../telegram/telegram.service';
import { MediaService } from './media.service';
import { AutotekaImportService } from './autoteka-import.service';

const MAX_MEDIA_PER_LOT = 150;
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
  /** Адрес из справочника; null — снять адрес */
  @IsOptional() @IsUUID() addressId?: string | null;
  /** Альтернатива загрузке PDF: внешняя ссылка на отчёт Автотеки; null/'' — снять */
  @IsOptional() @IsString() autotekaUrl?: string | null;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

class AutotekaImportDto {
  /** Можно передать ссылку явно; если не передана — берём autotekaUrl у лота. */
  @IsOptional() @IsString() url?: string;
}

@Roles(...STAFF)
@Controller('admin/lots')
export class AdminLotsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly lifecycle: LifecycleService,
    private readonly media: MediaService,
    private readonly realtime: RealtimeService,
    private readonly telegram: TelegramService,
    private readonly autotekaImport: AutotekaImportService,
  ) {}

  @Get()
  async list(@Query('filter') filter = 'all', @Query() page: PageQueryDto) {
    const limit = page.limit ?? PAGE_LIMITS.admin;
    const offset = page.offset ?? 0;
    // Архивные скрыты из всех вкладок, кроме явного 'archived'.
    const notArchived = { archivedAt: null };
    const where: Prisma.LotWhereInput =
      filter === 'archived'
        ? { archivedAt: { not: null } }
        : filter === 'draft'
          ? { ...notArchived, published: false }
          : filter === 'live'
            ? { ...notArchived, status: 'live' }
            : filter === 'soon'
              ? { ...notArchived, status: 'upcoming' }
              : filter === 'done'
                ? { ...notArchived, status: { in: ['sold', 'finished', 'withdrawn'] } }
                : notArchived;
    const [lots, total] = await this.prisma.$transaction([
      this.prisma.lot.findMany({
        where,
        include: { photos: true, deal: { select: { status: true, winnerUserId: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.lot.count({ where }),
    ]);
    const defaults = await this.settings.lotDefaults();
    return { items: lots.map((l) => this.toAdminDto(l, defaults)), total, limit, offset };
  }

  @Post('autoteka/draft')
  async createFromAutoteka(@Body() dto: AutotekaImportDto) {
    const source = dto.url?.trim();
    if (!source) throw new BadRequestException('Укажите ссылку на отчёт Автотеки');
    const report = await this.autotekaImport.importFromUrl(source);
    const now = Date.now();
    const startsAt = new Date(now + 24 * 60 * 60 * 1000);
    const endsAt = new Date(now + 8 * 24 * 60 * 60 * 1000);
    const lot = await this.prisma.lot.create({
      data: {
        ...this.autotekaLotFields(report),
        startPrice: 1n,
        reservePrice: 1n,
        currentPrice: 1n,
        startsAt,
        endsAt,
        originalEndsAt: endsAt,
        published: false,
        status: 'draft',
        autotekaUrl: report.sourceUrl,
        autotekaReport: report as unknown as Prisma.InputJsonValue,
        autotekaImportedAt: new Date(report.importedAt),
      },
    });
    return { id: lot.id };
  }

  @Get(':id')
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUnique({
      where: { id },
      include: { photos: true, deal: { select: { status: true, winnerUserId: true } } },
    });
    if (!lot) throw new NotFoundException();
    const defaults = await this.settings.lotDefaults();
    return this.toAdminDto(lot, defaults);
  }

  @Post()
  async create(@Body() dto: LotFormDto) {
    if (dto.published) this.assertFutureDates(dto);
    const lot = await this.prisma.lot.create({ data: await this.toCreateData(dto) });
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
    // Снятие с публикации до старта без ставок — честный возврат в черновик.
    // Любой опубликованный лот в draft/upcoming без ставок: при снятии видимости
    // статус строго draft (не остаётся upcoming → не «отыгрывается» в finished).
    const revertToDraft =
      existing.published &&
      dto.published === false &&
      ['draft', 'upcoming'].includes(existing.status) &&
      existing.bidCount === 0;

    const keepTerminalPublished =
      existing.published &&
      dto.published === false &&
      ['sold', 'finished', 'withdrawn'].includes(existing.status);

    const lot = await this.prisma.lot.update({
      where: { id },
      data: {
        ...(await this.toUpdateData(dto, existing, revertToDraft ? 'draft' : undefined)),
        ...(keepTerminalPublished ? { published: true } : {}),
      },
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
      this.assertReadyToPublish(lot);
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
        ...(await this.toCreateData(dto)),
        relistedFromLotId: src.id,
        autotekaPdfKey: src.autotekaPdfKey,
        autotekaReport: src.autotekaReport ?? Prisma.JsonNull,
        autotekaImportedAt: src.autotekaImportedAt,
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

  /** Архив лота: скрыть из каталога и основных вкладок. Снимаем джобы движка. */
  @Post(':id/archive')
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException();
    if (lot.status === 'live') throw new BadRequestException('Сначала завершите или снимите торги');
    await this.lifecycle.cancelJobs(id);
    const archivedAt = new Date();
    await this.prisma.lot.update({ where: { id }, data: { archivedAt } });
    // Планируем очистку медиа из S3 через неделю после архивации (grace на разархивацию).
    await this.lifecycle.scheduleMediaPurge(id, archivedAt);
    return { ok: true };
  }

  @Post(':id/unarchive')
  async unarchive(@Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.lot.update({ where: { id }, data: { archivedAt: null } });
    // Отменяем запланированную очистку медиа, если файлы ещё не удалены.
    await this.lifecycle.cancelMediaPurge(id);
    return { ok: true };
  }

  /** Удаление лота — только admin, и только без ставок/сделки и не в эфире. */
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    if (actor!.role !== 'admin' && actor!.role !== 'director') {
      throw new ForbiddenException('Удаление доступно только администратору');
    }
    const lot = await this.prisma.lot.findUnique({ where: { id }, include: { photos: true } });
    if (!lot) throw new NotFoundException();
    if (lot.status === 'live') throw new ConflictException('Лот в эфире — сначала завершите торги');
    if (lot.bidCount > 0) throw new ConflictException('У лота есть ставки — используйте архив');
    const deal = await this.prisma.deal.findUnique({ where: { lotId: id }, select: { id: true } });
    if (deal) throw new ConflictException('По лоту есть сделка — используйте архив');
    await this.lifecycle.cancelJobs(id);
    // Сначала чистим S3 (фото/видео/pdf), потом каскадно удаляем лот.
    for (const p of lot.photos) {
      if (!p.objectKey) continue;
      if (p.kind === 'video') await this.media.deleteObject(p.objectKey).catch(() => undefined);
      else await this.media.deleteLotPhoto(p.objectKey).catch(() => undefined);
    }
    if (lot.autotekaPdfKey) await this.media.deleteObject(lot.autotekaPdfKey).catch(() => undefined);
    await this.prisma.lot.delete({ where: { id } });
    return { ok: true };
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

  @Post(':id/autoteka/import')
  async importAutoteka(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AutotekaImportDto) {
    const lot = await this.prisma.lot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException();
    const source = dto.url?.trim() || lot.autotekaUrl?.trim();
    if (!source) throw new BadRequestException('Укажите ссылку на отчёт Автотеки');
    const report = await this.autotekaImport.importFromUrl(source);
    const updated = await this.prisma.lot.update({
      where: { id },
      data: {
        autotekaUrl: lot.autotekaUrl || report.sourceUrl,
        autotekaReport: report as unknown as Prisma.InputJsonValue,
        autotekaImportedAt: new Date(report.importedAt),
      },
      include: { photos: true, deal: { select: { status: true, winnerUserId: true } } },
    });
    const defaults = await this.settings.lotDefaults();
    return this.toAdminDto(updated, defaults);
  }

  @Delete(':id/autoteka/import')
  async clearAutotekaImport(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException();
    const updated = await this.prisma.lot.update({
      where: { id },
      data: { autotekaReport: Prisma.JsonNull, autotekaImportedAt: null },
      include: { photos: true, deal: { select: { status: true, winnerUserId: true } } },
    });
    const defaults = await this.settings.lotDefaults();
    return this.toAdminDto(updated, defaults);
  }

  private toAdminDto(
    lot: Prisma.LotGetPayload<{ include: { photos: true } }> & {
      deal?: { status: DealStatus; winnerUserId: string } | null;
    },
    defaults: { bidStep: number; feeRate: number },
  ) {
    return {
      ...lotToDto(lot, defaults),
      published: lot.published,
      lotBidStep: lot.bidStep != null ? Number(lot.bidStep) : null,
      lotFeeRate: lot.feeRate != null ? Number(lot.feeRate) : null,
      addressId: lot.addressId,
      /** Сырое значение внешней ссылки на Автотеку (для редактирования в форме) */
      autotekaUrl: lot.autotekaUrl ?? null,
      /** Загружен ли PDF-файл (в отличие от внешней ссылки) */
      autotekaPdfAttached: Boolean(lot.autotekaPdfKey),
      autotekaImportedAt: lot.autotekaImportedAt?.toISOString() ?? null,
      archived: Boolean(lot.archivedAt),
      /** Статус сделки лота (для ручного выбора победителя); null — сделки нет. */
      dealStatus: lot.deal?.status ?? null,
      /** Текущий победитель/сделка лота; null — нет. */
      dealWinnerUserId: lot.deal?.winnerUserId ?? null,
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

  private assertReadyToPublish(lot: {
    make: string;
    model: string;
    year: number;
    startPrice: bigint;
    reservePrice: bigint;
  }): void {
    const missing: string[] = [];
    if (!lot.make.trim() || lot.make === 'Автомобиль') missing.push('марку');
    if (!lot.model.trim() || lot.model === 'из Автотеки') missing.push('модель');
    if (!lot.year || lot.year < 1900) missing.push('год выпуска');
    if (lot.startPrice <= 1n) missing.push('стартовую цену');
    if (lot.reservePrice <= 1n) missing.push('резерв');
    if (missing.length) throw new BadRequestException(`Перед публикацией заполните ${missing.join(', ')}`);
  }

  private autotekaVehicleValue(report: AutotekaReportDto, key: string): string {
    return (report.vehicleInfo ?? []).find((item) => item.key.trim().toLowerCase() === key.toLowerCase())?.value.trim() ?? '';
  }

  private autotekaFirstVehicleValue(report: AutotekaReportDto, keys: string[]): string {
    for (const key of keys) {
      const value = this.autotekaVehicleValue(report, key);
      if (value) return value;
    }
    return '';
  }

  private autotekaFirstMatchingVehicleValue(report: AutotekaReportDto, keys: string[], pattern: RegExp): string {
    for (const key of keys) {
      const value = this.autotekaVehicleValue(report, key);
      if (value && pattern.test(value)) return value;
    }
    return '';
  }

  private latestAutotekaMileage(report: AutotekaReportDto): number {
    const points = (report.mileage ?? []).filter((point) => point.mileage > 0);
    if (!points.length) return 0;
    const sorted = points
      .map((point, index) => ({ point, index, time: point.date ? new Date(point.date).getTime() : Number.NaN }))
      .sort((a, b) => {
        const at = Number.isNaN(a.time) ? -Infinity : a.time;
        const bt = Number.isNaN(b.time) ? -Infinity : b.time;
        return at === bt ? a.index - b.index : at - bt;
      });
    return sorted[sorted.length - 1]!.point.mileage;
  }

  private parseAutotekaEngine(value: string): { engine: string; power: number } {
    const parts = value.split('/').map((part) => part.trim()).filter(Boolean);
    const powerPart = parts.find((part) => /л\.?\s*с/i.test(part));
    return {
      engine: parts[0] ?? '',
      power: Number(powerPart?.match(/\d[\d\s\u00a0\u202f]*/)?.[0]?.replace(/\D/g, '') ?? 0),
    };
  }

  private normalizeAutotekaFuel(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('gasoline') || normalized.includes('petrol') || normalized.includes('бенз')) return 'Бензин';
    if (normalized.includes('diesel') || normalized.includes('диз')) return 'Дизель';
    if (normalized.includes('electric') || normalized.includes('элект')) return 'Электро';
    if (normalized.includes('hybrid') || normalized.includes('гибрид')) return 'Гибрид';
    if (normalized.includes('lpg') || normalized.includes('cng') || normalized.includes('газ')) return 'Газ';
    return '';
  }

  private normalizeAutotekaTransmission(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '';
    const speed = normalized.match(/(\d+)\s*-?\s*(?:speed|ступ|ст\.?)/i)?.[1];
    if (normalized.includes('auto') || normalized.includes('automatic') || normalized.includes('автомат') || normalized.includes('акп')) {
      return speed ? `Автомат · ${speed} ст.` : 'Автомат';
    }
    if (normalized.includes('manual') || normalized.includes('механ')) return 'Механика';
    if (normalized.includes('robot') || normalized.includes('робот')) return 'Робот';
    if (normalized.includes('variator') || normalized.includes('cvt') || normalized.includes('вариатор')) return 'Вариатор';
    return '';
  }

  private normalizeAutotekaDrive(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('рулев') || normalized.includes('руль') || normalized.includes('lhd') || normalized.includes('rhd')) return '';
    if (normalized.includes('all') || normalized.includes('4wd') || normalized.includes('awd') || normalized.includes('4matic') || normalized.includes('пол')) return 'Полный';
    if (normalized.includes('front') || normalized.includes('fwd') || normalized.includes('перед')) return 'Передний';
    if (normalized.includes('rear') || normalized.includes('rwd') || normalized.includes('зад')) return 'Задний';
    if (normalized.includes('2wd')) return 'Передний';
    return '';
  }

  private autotekaFuelValue(report: AutotekaReportDto): string {
    const direct = this.autotekaFirstVehicleValue(report, ['Топливо', 'Тип топлива', 'Вид топлива', 'Тип двигателя']);
    const aggregate = this.autotekaFirstMatchingVehicleValue(report, ['Агрегаты'], /gasoline|petrol|diesel|electric|hybrid|бенз|диз|элект|гибрид|газ/i);
    return this.normalizeAutotekaFuel(direct || aggregate);
  }

  private autotekaTransmissionSource(report: AutotekaReportDto): string {
    return (
      this.autotekaFirstVehicleValue(report, ['Коробка передач', 'КПП', 'АКП', 'Трансмиссия', 'Тип КПП']) ||
      this.autotekaFirstMatchingVehicleValue(report, ['Агрегаты'], /акп|кп|автомат|manual|automatic|auto|cvt|вариатор|ступен/i)
    );
  }

  private autotekaDriveValue(report: AutotekaReportDto, transmissionSource: string): string {
    const direct = this.autotekaFirstVehicleValue(report, ['Привод', 'Тип привода']);
    const modelHint = this.autotekaFirstMatchingVehicleValue(
      report,
      ['Обозначение модели', 'Модификация', 'Комплектация'],
      /4matic|quattro|xdrive|4motion|allgrip|awd|4wd|fwd|rwd|2wd/i,
    );
    return this.normalizeAutotekaDrive(direct || modelHint || transmissionSource);
  }

  private autotekaLotFields(report: AutotekaReportDto): Pick<
    Prisma.LotUncheckedCreateInput,
    'make' | 'family' | 'model' | 'year' | 'mileage' | 'engine' | 'power' | 'fuel' | 'transmission' | 'drive' | 'body' | 'color' | 'vin' | 'description' | 'options'
  > {
    const model = report.model?.trim() || 'из Автотеки';
    const engine = this.parseAutotekaEngine(this.autotekaVehicleValue(report, 'Двигатель'));
    const transmissionSource = this.autotekaTransmissionSource(report);
    return {
      make: report.brand?.trim() || 'Автомобиль',
      family: model.split(' ')[0] || model,
      model,
      year: report.year || new Date().getFullYear(),
      mileage: this.latestAutotekaMileage(report),
      engine: engine.engine,
      power: engine.power,
      fuel: this.autotekaFuelValue(report),
      transmission: this.normalizeAutotekaTransmission(transmissionSource),
      drive: this.autotekaDriveValue(report, transmissionSource),
      body: this.autotekaVehicleValue(report, 'Тип ТС') || this.autotekaVehicleValue(report, 'Кузов'),
      color: this.autotekaVehicleValue(report, 'Цвет'),
      vin: report.vin?.trim() || null,
      description: '',
      options: [],
    };
  }

  /** Снимок адреса из справочника: «label · fullAddress». null/undefined → снять. */
  private async resolveAddress(
    addressId: string | null | undefined,
  ): Promise<{ addressId: string | null; addressText: string | null }> {
    if (!addressId) return { addressId: null, addressText: null };
    const a = await this.prisma.address.findUnique({ where: { id: addressId } });
    if (!a) throw new BadRequestException('Адрес не найден в справочнике');
    return { addressId: a.id, addressText: `${a.label} · ${a.fullAddress}` };
  }

  /** Общие поля формы (без торгового состояния). */
  private async formFields(dto: LotFormDto) {
    const addr = await this.resolveAddress(dto.addressId);
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
      addressId: addr.addressId,
      addressText: addr.addressText,
      autotekaUrl: dto.autotekaUrl?.trim() || null,
      startPrice: BigInt(dto.startPrice),
      reservePrice: BigInt(dto.reservePrice),
      bidStep: dto.bidStep != null ? BigInt(dto.bidStep) : null,
      feeRate: dto.feeRate ?? null,
      published: dto.published ?? false,
    };
  }

  private async toCreateData(dto: LotFormDto): Promise<Prisma.LotUncheckedCreateInput> {
    const endsAt = new Date(dto.endsAt);
    return {
      ...(await this.formFields(dto)),
      currentPrice: BigInt(dto.startPrice),
      startsAt: new Date(dto.startsAt),
      endsAt,
      originalEndsAt: endsAt,
      status: dto.published ? 'upcoming' : 'draft',
    };
  }

  /** На update торговое состояние лота со ставками (цена, лидер) не трогаем. */
  private async toUpdateData(
    dto: LotFormDto,
    existing: { bidCount: number; status: string },
    statusOverride?: 'draft',
  ): Promise<Prisma.LotUncheckedUpdateInput> {
    const endsAt = new Date(dto.endsAt);
    const hasBids = existing.bidCount > 0;
    return {
      ...(await this.formFields(dto)),
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
