/* Бэкфилл JPEG-вариантов lg-размера для соц-превью (Telegram/og:image).
 *
 * У фото, загруженных до фикса, есть только _lg.webp. Telegram не показывает
 * WebP по URL, поэтому догенерируем _lg.jpg из существующего _lg.webp.
 *
 * Запуск (на проде, после деплоя):
 *   pnpm --filter @hermes/api exec tsx prisma/backfill-lot-jpeg.ts
 *
 * Идемпотентно: можно гонять повторно — просто перезальёт JPEG.
 * Работает по внутреннему S3_ENDPOINT (minio:9000), не по публичному URL.
 */
import { PrismaClient } from '@prisma/client';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const prisma = new PrismaClient();
const bucket = process.env.S3_BUCKET ?? 'lots';
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'hermes',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'hermes-secret',
  },
});

async function getBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

async function main() {
  // Только фото из бакета (objectKey задан); externalUrl (Unsplash) — уже JPEG, пропускаем.
  const photos = await prisma.lotPhoto.findMany({
    where: { kind: 'photo', objectKey: { not: '' }, externalUrl: null },
    select: { id: true, objectKey: true },
  });
  console.log(`Найдено ${photos.length} фото для бэкфилла`);

  let ok = 0;
  let fail = 0;
  for (const p of photos) {
    try {
      const webp = await getBuffer(`${p.objectKey}_lg.webp`);
      const jpeg = await sharp(webp).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${p.objectKey}_lg.jpg`,
          Body: jpeg,
          ContentType: 'image/jpeg',
        }),
      );
      ok++;
      if (ok % 25 === 0) console.log(`  …${ok} готово`);
    } catch (e) {
      fail++;
      console.warn(`  ✗ ${p.objectKey}: ${(e as Error).message}`);
    }
  }
  console.log(`Готово: ${ok} залито, ${fail} ошибок`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
