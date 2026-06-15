/* Сиды: демо-данные из дизайн-прототипа (design-reference/hifi-shared.jsx),
   относительные startsIn/endsIn пересчитаны в абсолютные даты от момента сида. */
import { PrismaClient, LotStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();

const now = Date.now();
const min = (n: number) => new Date(now + n * 60_000);
const hrs = (n: number) => min(n * 60);

function unsplash(id: string, w = 1200) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;
}

interface SeedLot {
  make: string;
  family: string;
  model: string;
  year: number;
  status: LotStatus;
  published: boolean;
  img: string;
  photosCount: number;
  bid: number; // текущая макс. ставка (или стартовая)
  startPrice: number;
  reserve: number;
  startsAt: Date;
  endsAt: Date;
  mileage: number;
  engine: string;
  power: number;
  fuel: string;
  transmission: string;
  drive: string;
  body: string;
  color: string;
  bids: number;
  watchers: number;
  desc: string;
  options: string[];
  vin: string | null;
}

const LOTS: SeedLot[] = [
  {
    make: 'Mercedes-Benz', family: 'E-Class', model: 'E 300 4MATIC', year: 2022,
    status: 'live', published: true, img: unsplash('1503376780353-7e6692767b70'), photosCount: 18,
    bid: 3_820_000, startPrice: 3_280_000, reserve: 3_500_000,
    startsAt: hrs(-3), endsAt: min(25),
    mileage: 42_000, engine: '2.0 турбо', power: 258, fuel: 'Бензин', transmission: 'Автомат · 9 ст.',
    drive: 'Полный 4MATIC', body: 'Седан', color: 'Обсидиан чёрный', bids: 27, watchers: 184,
    desc: 'Один владелец, обслуживание у официального дилера. Полный пакет документов, сервисная книжка. Комплектация AMG-Line: панорама, Burmester, адаптивная подвеска. Без участия в ДТП по данным проверки.',
    options: ['Панорама', 'Кожа Nappa', 'Burmester', 'Адаптивный круиз', 'Камеры 360°', 'Подогрев и вентиляция'],
    vin: 'W1K2130421A123456',
  },
  {
    make: 'BMW', family: 'X3', model: 'X3 xDrive30i', year: 2021,
    status: 'live', published: true, img: unsplash('1555215695-3004980ad54e'), photosCount: 22,
    bid: 3_140_000, startPrice: 2_800_000, reserve: 3_400_000,
    startsAt: hrs(-2), endsAt: min(45),
    mileage: 58_000, engine: '2.0 турбо', power: 252, fuel: 'Бензин', transmission: 'Автомат · 8 ст.',
    drive: 'Полный xDrive', body: 'SUV', color: 'Альпийский белый', bids: 19, watchers: 122,
    desc: 'Активный круиз, проекция, Harman/Kardon. Зимний пакет. Резина два комплекта. Лёгкие косметические сколы на переднем бампере — отражено в отчёте.',
    options: ['Проекция', 'Harman/Kardon', 'Зимний пакет', 'Электропривод двери', 'Подогрев руля'],
    vin: 'X4XTS99480L123457',
  },
  {
    make: 'Audi', family: 'A6', model: 'A6 45 TFSI quattro', year: 2021,
    status: 'upcoming', published: true, img: unsplash('1606152421802-db97b9c7a11b'), photosCount: 16,
    bid: 2_450_000, startPrice: 2_450_000, reserve: 2_600_000,
    startsAt: min(90), endsAt: hrs(5),
    mileage: 61_000, engine: '2.0 TFSI', power: 245, fuel: 'Бензин', transmission: 'Робот · 7 ст.',
    drive: 'Полный quattro', body: 'Седан', color: 'Серый дайтона', bids: 0, watchers: 96,
    desc: 'Виртуальная панель, матричные фары, кожа Valcona. Один владелец по ПТС. Все ТО пройдены вовремя.',
    options: ['Matrix LED', 'Virtual Cockpit', 'Кожа Valcona', 'Bang & Olufsen'],
    vin: 'WAUZZZF25MN123458',
  },
  {
    // Лот для проверки антиснайпинга — закрывается через ~4 минуты после сида
    make: 'Lexus', family: 'RX', model: 'RX 350', year: 2020,
    status: 'live', published: true, img: unsplash('1568605117036-5fe5e7bab0b7'), photosCount: 20,
    bid: 4_180_000, startPrice: 3_600_000, reserve: 3_900_000,
    startsAt: hrs(-4), endsAt: min(4),
    mileage: 73_000, engine: '3.5 V6', power: 300, fuel: 'Бензин', transmission: 'Автомат · 8 ст.',
    drive: 'Полный', body: 'SUV', color: 'Серебро', bids: 31, watchers: 210,
    desc: 'Mark Levinson, вентиляция сидений, head-up. Максимальная комплектация Executive. Идеальное состояние салона.',
    options: ['Mark Levinson', 'Head-up', 'Вентиляция сидений', 'Люк'],
    vin: 'JTJBZMCA902123459',
  },
  {
    make: 'Porsche', family: '911', model: '911 Carrera', year: 2019,
    status: 'sold', published: true, img: unsplash('1605559424843-9e4c228bf1c2'), photosCount: 24,
    bid: 6_250_000, startPrice: 5_200_000, reserve: 5_800_000,
    startsAt: hrs(-31), endsAt: hrs(-24),
    mileage: 38_000, engine: '3.0 турбо', power: 385, fuel: 'Бензин', transmission: 'PDK · 8 ст.',
    drive: 'Задний', body: 'Купе', color: 'Гоночный жёлтый', bids: 41, watchers: 356,
    desc: 'Sport Chrono, спортивный выхлоп, керамика. Полная история обслуживания Porsche. Продан выше резерва.',
    options: ['Sport Chrono', 'Керамика', 'Спорт-выхлоп', 'Ковши'],
    vin: 'WP0ZZZ99ZKS123460',
  },
  {
    make: 'Toyota', family: 'Camry', model: 'Camry 2.5', year: 2021,
    status: 'finished', published: true, img: unsplash('1494976388531-d1058494cdd8'), photosCount: 14,
    bid: 1_780_000, startPrice: 1_500_000, reserve: 2_100_000,
    startsAt: hrs(-55), endsAt: hrs(-48),
    mileage: 88_000, engine: '2.5', power: 200, fuel: 'Бензин', transmission: 'Автомат · 8 ст.',
    drive: 'Передний', body: 'Седан', color: 'Чёрный', bids: 12, watchers: 74,
    desc: 'Один владелец, такси не работала. Резерв не достигнут — лот можно перевыставить.',
    options: ['Кожа', 'Камера', 'Климат'],
    vin: 'XW7BF4FK60S123461',
  },
];

async function main() {
  console.log('Очистка БД…');
  await prisma.$transaction([
    prisma.auctionEvent.deleteMany(),
    prisma.deal.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.pushSubscription.deleteMany(),
    prisma.lot.updateMany({ data: { currentBidId: null } }),
    prisma.bid.deleteMany(),
    prisma.lotPhoto.deleteMany(),
    prisma.lot.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.settings.deleteMany(),
  ]);

  console.log('Настройки…');
  await prisma.settings.create({
    data: {
      id: 1,
      feeRate: 0.015,
      defaultBidStep: 20_000n,
      antisnipeEnabled: true,
      antisnipeWindowSec: 120,
      antisnipeExtensionSec: 120,
      managerContacts: {
        name: 'Дмитрий Соколов',
        role: 'Старший менеджер',
        phone: '+7 905 000-11-22',
        telegram: '@hermes_trade',
        whatsapp: '+7 905 000-11-22',
        email: 'manager@hermes-trade.ru',
      },
      notificationToggles: { outbid: true, won: true, lot_starting: true, lot_ending: true, lot_extended: true, lot_withdrawn: true, deal_update: true },
    },
  });

  console.log('Пользователи…');
  const mkUser = (i: number, data: Partial<Parameters<typeof prisma.user.create>[0]['data']> = {}) =>
    prisma.user.create({
      data: {
        yandexId: `dev-${i}`,
        displayName: `Покупатель ${i}`,
        role: Role.buyer,
        fullName: `Тестовый Покупатель ${i}`,
        phone: `+7 900 000-00-${String(i).padStart(2, '0')}`,
        email: `buyer${i}@example.com`,
        contactsFilledAt: new Date(),
        ...data,
      },
    });

  const admin = await prisma.user.create({
    data: {
      yandexId: 'dev-admin', displayName: 'Администратор', role: Role.admin,
      fullName: 'Администратор Салона', email: 'admin@hermes-trade.ru',
      phone: '+7 905 000-00-01', contactsFilledAt: new Date(),
    },
  });
  const manager = await prisma.user.create({
    data: {
      yandexId: 'dev-manager', displayName: 'Дмитрий Соколов', role: Role.manager,
      fullName: 'Дмитрий Соколов', email: 'manager@hermes-trade.ru',
      phone: '+7 905 000-11-22', contactsFilledAt: new Date(),
    },
  });
  const buyers = [];
  for (let i = 1; i <= 8; i++) buyers.push(await mkUser(i));
  // Покупатель без контактов — для проверки CONTACTS_REQUIRED
  buyers.push(
    await prisma.user.create({
      data: { yandexId: 'dev-nocontacts', displayName: 'Без Контактов', role: Role.buyer },
    }),
  );

  console.log('Лоты и ставки…');
  const step = 20_000;
  for (const l of LOTS) {
    const lot = await prisma.lot.create({
      data: {
        make: l.make, family: l.family, model: l.model, year: l.year,
        status: l.status, published: l.published,
        startPrice: BigInt(l.startPrice), reservePrice: BigInt(l.reserve),
        currentPrice: BigInt(l.bid), reserveMet: l.bids > 0 && l.bid >= l.reserve,
        startsAt: l.startsAt, endsAt: l.endsAt, originalEndsAt: l.endsAt,
        bidCount: l.bids, watchersCount: l.watchers,
        mileage: l.mileage, engine: l.engine, power: l.power, fuel: l.fuel,
        transmission: l.transmission, drive: l.drive, body: l.body, color: l.color,
        vin: l.vin, description: l.desc, options: l.options,
      },
    });

    // Фото: главное + плейсхолдеры (externalUrl только у первого, как в прототипе)
    await prisma.lotPhoto.createMany({
      data: Array.from({ length: Math.min(l.photosCount, 8) }, (_, k) => ({
        lotId: lot.id,
        objectKey: '',
        externalUrl: k === 0 ? l.img : null,
        sort: k,
      })),
    });

    // История ставок: восходящая к currentPrice с шагом step
    if (l.bids > 0) {
      const start = new Date(l.startsAt).getTime();
      const end = Math.min(new Date(l.endsAt).getTime(), now);
      let lastBidId: string | null = null;
      for (let k = 0; k < l.bids; k++) {
        const amount = l.bid - (l.bids - 1 - k) * step;
        const bidder = buyers[k % 8];
        const createdAt = new Date(start + ((end - start) * (k + 1)) / (l.bids + 1));
        const bid = await prisma.bid.create({
          data: {
            lotId: lot.id, userId: bidder.id, amount: BigInt(amount),
            clientBidId: crypto.randomUUID(), createdAt,
          },
        });
        lastBidId = bid.id;
      }
      await prisma.lot.update({ where: { id: lot.id }, data: { currentBidId: lastBidId } });
    }

    // Сделка для проданного лота — выдана недавно (чтобы дашборд сразу показал комиссию)
    if (l.status === 'sold') {
      const topBid = await prisma.bid.findFirst({ where: { lotId: lot.id }, orderBy: { amount: 'desc' } });
      if (topBid) {
        await prisma.deal.create({
          data: {
            lotId: lot.id, winnerUserId: topBid.userId, winningBidId: topBid.id,
            amount: topBid.amount, feeRate: 0.015,
            feeAmount: BigInt(Math.round(Number(topBid.amount) * 0.015)),
            status: 'delivered', managerId: manager.id, closedAt: new Date(now - 2 * 86_400_000),
          },
        });
      }
    }
  }

  // ── Демо-сделки в разных статусах (для дашборда: воронка + комиссия + date-range) ──
  // Берём лоты с историей ставок, у которых ещё нет сделки, и раскидываем по этапам.
  const dealtLotIds = new Set((await prisma.deal.findMany({ select: { lotId: true } })).map((d) => d.lotId));
  const candidates = (
    await prisma.lot.findMany({
      where: { bidCount: { gt: 0 } },
      include: { _count: { select: { bids: true } } },
      orderBy: { endsAt: 'desc' },
    })
  ).filter((lot) => !dealtLotIds.has(lot.id) && lot._count.bids > 0);

  // status, сколько дней назад «выдана» (для delivered), иначе closedAt = null
  const demo: Array<{ status: 'won' | 'contacted' | 'signed' | 'delivered' | 'cancelled'; deliveredDaysAgo?: number }> = [
    { status: 'delivered', deliveredDaysAgo: 1 },
    { status: 'delivered', deliveredDaysAgo: 5 },
    { status: 'delivered', deliveredDaysAgo: 20 },
    { status: 'signed' },
    { status: 'contacted' },
    { status: 'won' },
    { status: 'cancelled' },
  ];
  for (let i = 0; i < Math.min(demo.length, candidates.length); i++) {
    const lot = candidates[i];
    const d = demo[i];
    const topBid = await prisma.bid.findFirst({ where: { lotId: lot.id }, orderBy: { amount: 'desc' } });
    if (!topBid) continue;
    await prisma.deal.create({
      data: {
        lotId: lot.id, winnerUserId: topBid.userId, winningBidId: topBid.id,
        amount: topBid.amount, feeRate: 0.015,
        feeAmount: BigInt(Math.round(Number(topBid.amount) * 0.015)),
        status: d.status, managerId: manager.id,
        closedAt: d.deliveredDaysAgo != null ? new Date(now - d.deliveredDaysAgo * 86_400_000) : null,
      },
    });
  }

  // Избранное (lot 2 и 4 как в прототипе)
  const favLots = await prisma.lot.findMany({ where: { make: { in: ['BMW', 'Lexus'] } } });
  for (const fl of favLots) {
    await prisma.favorite.create({ data: { userId: buyers[0].id, lotId: fl.id } });
  }

  console.log(`Готово. Пользователи: admin=dev-admin, manager=dev-manager, buyers=dev-1..8, dev-nocontacts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
