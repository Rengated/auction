import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const SIZES = { card: 480, md: 900, lg: 1600 } as const;

/** Загрузка фото лота: sharp → webp в трёх размерах → S3/MinIO. */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly bucket = process.env.S3_BUCKET ?? 'lots';
  private readonly s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'hermes',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'hermes-secret',
    },
  });

  /** Возвращает objectKey (без суффикса размера). */
  async uploadLotPhoto(lotId: string, buffer: Buffer): Promise<string> {
    const key = `lots/${lotId}/${randomUUID()}`;
    await Promise.all(
      (Object.entries(SIZES) as Array<[keyof typeof SIZES, number]>).map(async ([name, width]) => {
        const webp = await sharp(buffer).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: `${key}_${name}.webp`,
            Body: webp,
            ContentType: 'image/webp',
          }),
        );
      }),
    );
    return key;
  }

  async deleteLotPhoto(objectKey: string): Promise<void> {
    await Promise.all(
      Object.keys(SIZES).map((name) =>
        this.s3
          .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: `${objectKey}_${name}.webp` }))
          .catch((e) => this.logger.warn(`delete ${objectKey}_${name}: ${e.message}`)),
      ),
    );
  }

  /** Видео хранится одним файлом как есть (транскодинга нет) — ключ с расширением. */
  async uploadLotVideo(lotId: string, buffer: Buffer, mimetype: string): Promise<string> {
    const ext = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }[mimetype] ?? 'mp4';
    const key = `lots/${lotId}/${randomUUID()}.${ext}`;
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mimetype }),
    );
    return key;
  }

  /** PDF-отчёт Автотеки как есть. */
  async uploadAutotekaPdf(lotId: string, buffer: Buffer): Promise<string> {
    const key = `lots/${lotId}/autoteka-${randomUUID()}.pdf`;
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: 'application/pdf' }),
    );
    return key;
  }

  /** Удаление одиночного объекта по точному ключу (видео, PDF). */
  async deleteObject(objectKey: string): Promise<void> {
    await this.s3
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }))
      .catch((e) => this.logger.warn(`delete ${objectKey}: ${e.message}`));
  }
}
