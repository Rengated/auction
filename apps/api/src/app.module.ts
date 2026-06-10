import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuctionEngineModule } from './modules/auction-engine/auction-engine.module';
import { LotsModule } from './modules/lots/lots.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PushModule } from './modules/push/push.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SellRequestsModule } from './modules/sell-requests/sell-requests.module';
import { UsersModule } from './modules/users/users.module';

function redisConnection() {
  const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  return { host: url.hostname, port: Number(url.port || 6379) };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    BullModule.forRoot({ connection: redisConnection() }),
    PrismaModule,
    RedisModule,
    RealtimeModule,
    PushModule,
    AuthModule,
    SettingsModule,
    NotificationsModule,
    LotsModule,
    AuctionEngineModule,
    SellRequestsModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
