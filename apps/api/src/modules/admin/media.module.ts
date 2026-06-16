import { Module } from '@nestjs/common';
import { MediaService } from './media.service';

/** S3/MinIO-доступ к медиа лотов. Используется админкой и движком (очистка медиа). */
@Module({
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
