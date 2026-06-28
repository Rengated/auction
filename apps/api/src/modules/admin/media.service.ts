import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const SIZES = { card: 480, md: 900, lg: 1600 } as const;

/** Загрузка фото лота: sharp → webp в трёх размерах → S3/MinIO. */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly bucket = process.env.S3_BUCKET ?? 'lots';
  private readonly credentials = {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'hermes',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'hermes-secret',
  };
  private readonly s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: this.credentials,
  });
  private readonly browserS3 = new S3Client({
    endpoint: process.env.S3_BROWSER_ENDPOINT ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: this.credentials,
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
    const key = this.createLotVideoKey(lotId, mimetype);
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mimetype }),
    );
    return key;
  }

  /** PDF-отчёт Автотеки как есть. */
  async uploadAutotekaPdf(lotId: string, buffer: Buffer): Promise<string> {
    const key = this.createAutotekaPdfKey(lotId);
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: 'application/pdf' }),
    );
    return key;
  }

  createLotVideoKey(lotId: string, mimetype: string): string {
    const ext = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }[mimetype] ?? 'mp4';
    return `lots/${lotId}/${randomUUID()}.${ext}`;
  }

  createAutotekaPdfKey(lotId: string): string {
    return `lots/${lotId}/autoteka-${randomUUID()}.pdf`;
  }

  async presignPutObject(objectKey: string, contentType: string, expiresIn = 15 * 60): Promise<string> {
    return getSignedUrl(
      this.browserS3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: contentType,
      }),
      { expiresIn },
    );
  }

  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }));
      return true;
    } catch {
      return false;
    }
  }

  /** Удаление одиночного объекта по точному ключу (видео, PDF). */
  async deleteObject(objectKey: string): Promise<void> {
    await this.s3
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }))
      .catch((e) => this.logger.warn(`delete ${objectKey}: ${e.message}`));
  }

  /**
   * Удаление всех S3-объектов лота (фото в 3 размерах, видео, PDF Автотеки).
   * Внешние ссылки (externalUrl) пропускаются — они не наши файлы.
   * Записи в БД здесь не трогаются (это делает вызывающий код).
   */
  async purgeLotMedia(media: {
    photos: Array<{ kind: 'photo' | 'video'; objectKey: string; externalUrl: string | null }>;
    autotekaPdfKey: string | null;
  }): Promise<void> {
    const tasks: Array<Promise<void>> = [];
    for (const p of media.photos) {
      if (!p.objectKey || p.externalUrl) continue; // внешние/пустые не наши
      tasks.push(p.kind === 'video' ? this.deleteObject(p.objectKey) : this.deleteLotPhoto(p.objectKey));
    }
    if (media.autotekaPdfKey) tasks.push(this.deleteObject(media.autotekaPdfKey));
    await Promise.all(tasks);
  }
}
