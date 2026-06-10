/**
 * Интеграционные тесты движка торгов — гейт этапа 1.
 * Работают с реальными Postgres/Redis из docker-compose.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ERROR_CODES } from '@hermes/shared';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { BidService } from '../src/modules/auction-engine/bid.service';
import { LifecycleService } from '../src/modules/auction-engine/lifecycle.service';

describe('Auction engine', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let bids: BidService;
  let lifecycle: LifecycleService;

  const createdLots: string[] = [];
  const createdUsers: string[] = [];

  async function createUser(suffix: string) {
    const u = await prisma.user.create({
      data: {
        yandexId: `test-${suffix}-${randomUUID()}`,
        displayName: `Тест ${suffix}`,
        fullName: 'Тест Тестов',
        phone: '+7 900 111-22-33',
        contactsFilledAt: new Date(),
      },
    });
    createdUsers.push(u.id);
    return u;
  }

  async function createLot(overrides: Partial<Parameters<PrismaService['lot']['create']>[0]['data']> = {}) {
    const now = Date.now();
    const lot = await prisma.lot.create({
      data: {
        make: 'Test',
        family: 'T',
        model: `Car ${randomUUID().slice(0, 8)}`,
        year: 2022,
        status: 'live',
        published: true,
        startPrice: 1_000_000n,
        reservePrice: 1_200_000n,
        currentPrice: 1_000_000n,
        startsAt: new Date(now - 3_600_000),
        endsAt: new Date(now + 600_000),
        originalEndsAt: new Date(now + 600_000),
        mileage: 10_000,
        engine: '2.0',
        power: 200,
        fuel: 'Бензин',
        transmission: 'АТ',
        drive: 'Полный',
        body: 'Седан',
        color: 'Чёрный',
        ...overrides,
      },
    });
    createdLots.push(lot.id);
    return lot;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    bids = app.get(BidService);
    lifecycle = app.get(LifecycleService);
  });

  afterAll(async () => {
    await prisma.deal.deleteMany({ where: { lotId: { in: createdLots } } });
    await prisma.lot.updateMany({ where: { id: { in: createdLots } }, data: { currentBidId: null } });
    await prisma.bid.deleteMany({ where: { lotId: { in: createdLots } } });
    await prisma.auctionEvent.deleteMany({ where: { lotId: { in: createdLots } } });
    await prisma.lot.deleteMany({ where: { id: { in: createdLots } } });
    await prisma.notification.deleteMany({ where: { userId: { in: createdUsers } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    await app.close();
  });

  it('(а) две конкурентные ставки одной суммой: проходит ровно одна', async () => {
    const lot = await createLot();
    const [u1, u2] = await Promise.all([createUser('a1'), createUser('a2')]);
    const amount = 1_020_000;

    const results = await Promise.allSettled([
      bids.placeBid(lot.id, u1.id, amount, randomUUID()),
      bids.placeBid(lot.id, u2.id, amount, randomUUID()),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason.getResponse().code).toBe(ERROR_CODES.BID_TOO_LOW);
    // Проигравший получил актуальный минимум для мгновенного ретрая
    expect(failed[0].reason.getResponse().details.minNextBid).toBe(amount + 20_000);

    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(Number(fresh.currentPrice)).toBe(amount);
    expect(fresh.bidCount).toBe(1);
  });

  it('(б) ставка в окне антиснайпинга продлевает торги', async () => {
    const lot = await createLot({ endsAt: new Date(Date.now() + 30_000) }); // конец через 30с < окно 120с
    const u = await createUser('b');
    const before = lot.endsAt.getTime();

    const res = await bids.placeBid(lot.id, u.id, 1_020_000, randomUUID());

    const after = new Date(res.lot.endsAt).getTime();
    expect(after).toBeGreaterThan(before);
    expect(after).toBeGreaterThanOrEqual(Date.now() + 100_000); // ~ +120с продление
    const events = await prisma.auctionEvent.findMany({ where: { lotId: lot.id, type: 'extended' } });
    expect(events).toHaveLength(1);
  });

  it('(в1) закрытие с взятым резервом → sold + сделка с комиссией 1.5%', async () => {
    const lot = await createLot();
    const u = await createUser('c1');
    const amount = 1_250_000; // выше резерва 1.2М
    await bids.placeBid(lot.id, u.id, amount, randomUUID());

    await lifecycle.closeLot(lot.id, { force: true });

    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(fresh.status).toBe('sold');
    const deal = await prisma.deal.findUniqueOrThrow({ where: { lotId: lot.id } });
    expect(deal.winnerUserId).toBe(u.id);
    expect(Number(deal.amount)).toBe(amount);
    expect(Number(deal.feeAmount)).toBe(Math.round(amount * 0.015));
    // Победителю создана нотификация won
    const notif = await prisma.notification.findFirst({ where: { userId: u.id, type: 'won' } });
    expect(notif).toBeTruthy();
  });

  it('(в2) закрытие без взятого резерва → finished, сделки нет', async () => {
    const lot = await createLot();
    const u = await createUser('c2');
    await bids.placeBid(lot.id, u.id, 1_050_000, randomUUID()); // ниже резерва

    await lifecycle.closeLot(lot.id, { force: true });

    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(fresh.status).toBe('finished');
    expect(await prisma.deal.findUnique({ where: { lotId: lot.id } })).toBeNull();
  });

  it('(в3) обычное закрытие при продлённых торгах — выходит без действий', async () => {
    const lot = await createLot({ endsAt: new Date(Date.now() + 500_000) });
    await lifecycle.closeLot(lot.id); // без force: ends_at в будущем
    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(fresh.status).toBe('live');
  });

  it('(г) страховочный поллер дозакрывает просроченный лот (рестарт воркера не теряет закрытие)', async () => {
    const lot = await createLot({ endsAt: new Date(Date.now() - 10_000) }); // уже просрочен, джобы нет
    await lifecycle.sweep();
    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(fresh.status).toBe('finished');
  });

  it('(г2) поллер дооткрывает upcoming с прошедшим стартом', async () => {
    const lot = await createLot({
      status: 'upcoming',
      startsAt: new Date(Date.now() - 5_000),
      endsAt: new Date(Date.now() + 600_000),
    });
    await lifecycle.sweep();
    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(fresh.status).toBe('live');
  });

  it('(д) идемпотентность: ретрай с тем же clientBidId не создаёт дубль', async () => {
    const lot = await createLot();
    const u = await createUser('d');
    const clientBidId = randomUUID();

    const r1 = await bids.placeBid(lot.id, u.id, 1_020_000, clientBidId);
    const r2 = await bids.placeBid(lot.id, u.id, 1_020_000, clientBidId);

    expect(r2.bid.id).toBe(r1.bid.id);
    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(fresh.bidCount).toBe(1);
  });

  it('(е) лидер не может перебить сам себя', async () => {
    const lot = await createLot();
    const u = await createUser('e');
    await bids.placeBid(lot.id, u.id, 1_020_000, randomUUID());
    await expect(bids.placeBid(lot.id, u.id, 1_040_000, randomUUID())).rejects.toMatchObject({
      response: { code: ERROR_CODES.ALREADY_LEADING },
    });
  });

  it('(ж) шторм ставок не ломает инварианты', async () => {
    const lot = await createLot({ endsAt: new Date(Date.now() + 600_000) });
    const users = await Promise.all(Array.from({ length: 6 }, (_, i) => createUser(`storm${i}`)));

    // 30 конкурентных попыток случайными суммами от случайных пользователей
    const attempts = Array.from({ length: 30 }, (_, i) => {
      const u = users[i % users.length];
      const amount = 1_020_000 + Math.floor(Math.random() * 10) * 20_000;
      return bids.placeBid(lot.id, u.id, amount, randomUUID()).catch(() => null);
    });
    await Promise.all(attempts);

    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    const allBids = await prisma.bid.findMany({ where: { lotId: lot.id, rejectedAt: null } });
    // Инварианты: current_price = max(ставок), bid_count = числу ставок, лидер корректен
    const maxBid = allBids.reduce((m, b) => (b.amount > m ? b.amount : m), 0n);
    expect(fresh.currentPrice).toBe(maxBid);
    expect(fresh.bidCount).toBe(allBids.length);
    const top = allBids.find((b) => b.amount === maxBid)!;
    expect(fresh.currentBidId).toBe(top.id);
    // Каждая следующая принятая ставка строго больше предыдущей
    const sorted = [...allBids].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].amount).toBeGreaterThan(sorted[i - 1].amount);
    }
  });

  it('(з) отклонение последней ставки откатывает цену', async () => {
    const lot = await createLot();
    const [u1, u2, mgr] = await Promise.all([createUser('z1'), createUser('z2'), createUser('zm')]);
    await bids.placeBid(lot.id, u1.id, 1_020_000, randomUUID());
    await bids.placeBid(lot.id, u2.id, 1_300_000, randomUUID()); // взял резерв

    await lifecycle.rejectLastBid(lot.id, mgr.id);

    const fresh = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(Number(fresh.currentPrice)).toBe(1_020_000);
    expect(fresh.bidCount).toBe(1);
    expect(fresh.reserveMet).toBe(false); // откат ниже резерва
  });
});
