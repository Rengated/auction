import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { YandexService } from './yandex.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { ContactsFilledGuard } from './contacts.guard';

/** Слабые/дефолтные секреты, которые недопустимы в проде. */
const INSECURE_SECRETS = ['', 'dev-secret', 'change-me-in-production'];

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? '';
  if (process.env.NODE_ENV === 'production' && INSECURE_SECRETS.includes(secret)) {
    throw new Error(
      'JWT_SECRET must be set to a strong, unique value in production (current value is empty or a known default).',
    );
  }
  return secret || 'dev-secret';
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtSecret(),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    YandexService,
    ContactsFilledGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, ContactsFilledGuard],
})
export class AuthModule {}
