import 'reflect-metadata';

// BigInt из Prisma в JSON-ответах сериализуется числом (суммы < 2^53)
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function () {
  return Number(this);
};
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { requestLoggingMiddleware } from './common/observability/request-logging.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // За Caddy реальный клиентский IP приходит в X-Forwarded-For — доверяем одному прокси,
  // чтобы req.ip (для rate limit и Telegram-алертов) был адресом клиента, а не прокси.
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use(requestLoggingMiddleware);
  app.enableCors({
    origin: [process.env.WEB_ORIGIN ?? 'http://localhost:5173', process.env.ADMIN_ORIGIN ?? 'http://localhost:5174'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000));
}

bootstrap();
