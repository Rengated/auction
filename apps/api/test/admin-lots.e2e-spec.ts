/**
 * Интеграционные тесты админ-управления лотами: фикс бага черновика и адрес-сущность.
 * Работают с реальными Postgres/Redis из docker-compose.
 */
import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AdminLotsController } from '../src/modules/admin/admin-lots.controller';

describe('Admin lots', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ctrl: AdminLotsController;

  const createdLots: string[] = [];
  const createdAddresses: string[] = [];

  /** Базовый payload формы лота (даты в будущем). */
  function form(over: Partial<Record<string, unknown>> = {}) {
    const startsAt = new Date(Date.now() + 2 * 3600_000).toISOString();
    const endsAt = new Date(Date.now() + 5 * 3600_000).toISOString();
    return {
      make: 'Test',
      model: `Draft ${Math.random().toString(36).slice(2, 8)}`,
      year: 2022,
      mileage: 10_000,
      engine: '2.0',
      power: 200,
      fuel: 'Бензин',
      transmission: 'Автомат',
      drive: 'Полный',
      body: 'Седан',
      color: 'Чёрный',
      startPrice: 1_000_000,
      reservePrice: 1_200_000,
      startsAt,
      endsAt,
      published: true,
      ...over,
    } as never;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    ctrl = app.get(AdminLotsController);
  });

  afterAll(async () => {
    await prisma.auctionEvent.deleteMany({ where: { lotId: { in: createdLots } } });
    await prisma.lot.deleteMany({ where: { id: { in: createdLots } } });
    await prisma.address.deleteMany({ where: { id: { in: createdAddresses } } });
    await app.close();
  });

  it('снятие опубликованного upcoming-лота с публикации → строго draft (не finished/upcoming)', async () => {
    const dto = form();
    const { id } = await ctrl.create(dto);
    createdLots.push(id);

    let lot = await prisma.lot.findUniqueOrThrow({ where: { id } });
    expect(lot.status).toBe('upcoming');
    expect(lot.published).toBe(true);

    // снимаем публикацию через форму (тумблер published=false)
    await ctrl.update(id, form({ published: false }));
    lot = await prisma.lot.findUniqueOrThrow({ where: { id } });
    expect(lot.status).toBe('draft');
    expect(lot.published).toBe(false);
  });

  it('публикация лота с прошедшей датой старта → 400, лот не «отыгрывается»', async () => {
    const dto = form({ published: false });
    const { id } = await ctrl.create(dto);
    createdLots.push(id);

    const past = new Date(Date.now() - 3600_000).toISOString();
    await expect(ctrl.update(id, form({ published: true, startsAt: past }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const lot = await prisma.lot.findUniqueOrThrow({ where: { id } });
    expect(lot.status).toBe('draft'); // остался черновиком, не finished
  });

  it('адрес из справочника пишется снимком в лот; удаление адреса не ломает лот', async () => {
    const addr = await prisma.address.create({
      data: { label: 'Шоурум Тест', fullAddress: 'г. Тест, ул. Тестовая, 1', city: 'Тест' },
    });
    createdAddresses.push(addr.id);

    const { id } = await ctrl.create(form({ addressId: addr.id }));
    createdLots.push(id);

    let lot = await prisma.lot.findUniqueOrThrow({ where: { id } });
    expect(lot.addressId).toBe(addr.id);
    expect(lot.addressText).toBe('Шоурум Тест · г. Тест, ул. Тестовая, 1');

    // удаление адреса из справочника: FK SetNull, снимок остаётся
    await prisma.address.delete({ where: { id: addr.id } });
    createdAddresses.pop();
    lot = await prisma.lot.findUniqueOrThrow({ where: { id } });
    expect(lot.addressId).toBeNull();
    expect(lot.addressText).toBe('Шоурум Тест · г. Тест, ул. Тестовая, 1');
  });
});
