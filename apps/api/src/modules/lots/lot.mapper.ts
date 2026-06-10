import type { Lot, LotPhoto } from '@prisma/client';
import type { AutotekaReport, LotDto, LotPhotoDto, LotTickDto } from '@hermes/shared';

const S3_PUBLIC = process.env.S3_PUBLIC_URL ?? 'http://localhost:9000/lots';

export function photoUrl(p: LotPhoto, size: 'card' | 'md' | 'lg'): string {
  if (p.externalUrl) {
    const w = { card: 480, md: 900, lg: 1600 }[size];
    // Unsplash-ссылки сидов поддерживают параметр w
    return p.externalUrl.replace(/w=\d+/, `w=${w}`);
  }
  if (!p.objectKey) return '';
  return `${S3_PUBLIC}/${p.objectKey}_${size}.webp`;
}

export function photoToDto(p: LotPhoto): LotPhotoDto {
  return { id: p.id, card: photoUrl(p, 'card'), md: photoUrl(p, 'md'), lg: photoUrl(p, 'lg'), sort: p.sort };
}

export function lotToTick(lot: Lot): LotTickDto {
  return {
    id: lot.id,
    status: lot.status,
    currentPrice: Number(lot.currentPrice),
    bidCount: lot.bidCount,
    reserveMet: lot.reserveMet,
    endsAt: lot.endsAt.toISOString(),
    serverNow: new Date().toISOString(),
  };
}

export function lotToDto(
  lot: Lot & { photos: LotPhoto[] },
  defaultBidStep: number,
  extra?: { isFavorite?: boolean; my?: { isLeading: boolean; lastBid: number | null } },
): LotDto {
  return {
    id: lot.id,
    make: lot.make,
    family: lot.family,
    model: lot.model,
    year: lot.year,
    status: lot.status,
    currentPrice: Number(lot.currentPrice),
    startPrice: Number(lot.startPrice),
    bidStep: lot.bidStep != null ? Number(lot.bidStep) : defaultBidStep,
    reserveMet: lot.reserveMet,
    reservePrice: Number(lot.reservePrice),
    startsAt: lot.startsAt.toISOString(),
    endsAt: lot.endsAt.toISOString(),
    bidCount: lot.bidCount,
    watchersCount: lot.watchersCount,
    photos: [...lot.photos].sort((a, b) => a.sort - b.sort).map(photoToDto),
    mileage: lot.mileage,
    engine: lot.engine,
    power: lot.power,
    fuel: lot.fuel,
    transmission: lot.transmission,
    drive: lot.drive,
    body: lot.body,
    color: lot.color,
    vin: lot.vin,
    description: lot.description,
    options: (lot.options as string[]) ?? [],
    autoteka: (lot.autoteka as AutotekaReport | null) ?? null,
    isFavorite: extra?.isFavorite,
    my: extra?.my,
  };
}
