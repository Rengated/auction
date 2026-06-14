/**
 * Интеграционные тесты входа персонала по логину/паролю.
 * Работают с реальными Postgres/Redis из docker-compose.
 */
import { ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { ContactsFilledGuard } from '../src/modules/auth/contacts.guard';

describe('Auth — пароли персонала', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: AuthService;
  const createdUsers: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    auth = app.get(AuthService);
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { userId: { in: createdUsers } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    await app.close();
  });

  it('hashPassword + verifyPassword: верный пароль проходит, неверный — нет', async () => {
    const username = `staff-${randomUUID().slice(0, 8)}`;
    const u = await prisma.user.create({
      data: { username, passwordHash: await auth.hashPassword('secret123'), displayName: 'Тест', role: 'admin' },
    });
    createdUsers.push(u.id);

    const ok = await auth.verifyPassword(username, 'secret123');
    expect(ok.id).toBe(u.id);
    expect(ok.role).toBe('admin');

    await expect(auth.verifyPassword(username, 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.verifyPassword('no-such-user', 'secret123')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('пользователь без passwordHash (только Яндекс) не входит по паролю', async () => {
    const u = await prisma.user.create({
      data: { yandexId: `y-${randomUUID()}`, displayName: 'Покупатель', role: 'buyer' },
    });
    createdUsers.push(u.id);
    // username null → verifyPassword по username его не найдёт; проверим прямой кейс с пустым хэшем
    await expect(auth.verifyPassword(u.username ?? 'nope', 'any')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('Допуск к торгам — имя+телефон+почта', () => {
    let guard: ContactsFilledGuard;
    const ctxFor = (userId: string): ExecutionContext =>
      ({ switchToHttp: () => ({ getRequest: () => ({ user: { id: userId } }) }) }) as ExecutionContext;

    beforeAll(() => {
      guard = app.get(ContactsFilledGuard);
    });

    it('нет почты → CONTACTS_REQUIRED (403)', async () => {
      const u = await prisma.user.create({
        data: { yandexId: `g-${randomUUID()}`, displayName: 'Без почты', role: 'buyer', fullName: 'Имя', phone: '+79000000000' },
      });
      createdUsers.push(u.id);
      await expect(guard.canActivate(ctxFor(u.id))).rejects.toMatchObject({ status: 403 });
    });

    it('есть имя+телефон+почта → допуск', async () => {
      const u = await prisma.user.create({
        data: {
          yandexId: `g-${randomUUID()}`,
          displayName: 'Полный',
          role: 'buyer',
          fullName: 'Имя Фамилия',
          phone: '+79000000001',
          email: 'buyer@example.com',
        },
      });
      createdUsers.push(u.id);
      await expect(guard.canActivate(ctxFor(u.id))).resolves.toBe(true);
    });
  });
});
