# Развёртывание Hermes Trade на сервер

Весь стек поднимается одним docker compose на одной машине: PostgreSQL, Redis, MinIO,
API (NestJS) и Caddy (reverse-proxy + статика клиента и админки + автоматический HTTPS).

Рекомендуемый сервер: 4 vCPU · 8 ГБ RAM · 150+ ГБ NVMe · Ubuntu 24.04.
Минимум: 2 vCPU · 4 ГБ (объём диска определяется видео в лотах).

## 1. DNS

Создайте три A-записи на IP сервера:

| Запись | Назначение |
|---|---|
| `auction.example.ru` | клиент покупателя (PWA) |
| `admin.auction.example.ru` | админка |
| `s3.auction.example.ru` | прямые загрузки видео/PDF в MinIO |

Дождитесь, пока записи разрезолвятся (`dig +short auction.example.ru`) — без этого Caddy не выпустит сертификаты.

## 2. Сервер

```bash
# Docker + compose-плагин
curl -fsSL https://get.docker.com | sh

# Код
git clone <ваш-репозиторий> /opt/auction
cd /opt/auction

# Окружение
cp .env.prod.example .env
openssl rand -hex 32   # → POSTGRES_PASSWORD
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 24   # → S3_SECRET_KEY
npx web-push generate-vapid-keys   # → VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
nano .env              # DOMAIN, ACME_EMAIL, секреты, ключи Яндекса
```

## 3. Яндекс OAuth (вход покупателей)

1. https://oauth.yandex.ru → «Создать приложение», платформа «Веб-сервисы».
2. Redirect URI (один, для клиента):
   - `https://auction.example.ru/api/auth/yandex/callback`
3. Доступы: «Доступ к email», «Доступ к аватару», «Доступ к имени/фамилии».
4. ClientID/Client secret → в `.env` (`YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET`).
5. Проверьте, что `API_PUBLIC_URL=https://auction.example.ru/api` в `.env` (redirect_uri должен совпадать).

> Админы/менеджеры входят НЕ через Яндекс, а по логину+паролю (см. §5).

## 4. Запуск

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api   # дождаться "Nest application successfully started"
```

Миграции БД применяются автоматически при старте контейнера `api`.
Проверка: `https://auction.example.ru` — каталог (пустой), `https://admin.auction.example.ru` — экран входа.

## 5. Первый администратор

Админы/менеджеры входят в админку по **логину и паролю**. Первого администратора создайте CLI-командой в контейнере api:

```bash
docker compose -f docker-compose.prod.yml exec api pnpm exec tsx prisma/create-admin.ts admin '<надёжный-пароль>'
```

(идемпотентно: повторный запуск с тем же логином — меняет пароль). Затем войдите в `https://admin.auction.example.ru` с логином `admin` и этим паролем.

Дальше **новых сотрудников создаёт сам администратор** в админке (раздел «Пользователи» → «Персонал»): задаёт логин, пароль и роль (`manager`/`admin`). Создавать/редактировать персонал может только `admin`; `manager` ведёт торги, но не управляет персоналом.

Демо-данные (6 лотов, тестовые пользователи) при желании: `docker compose -f docker-compose.prod.yml exec api pnpm exec tsx prisma/seed.ts` — **стирает все данные**, только для пустой площадки.

## 6. После запуска — чек-лист

- [ ] PWA ставится на телефон (адресная строка → «Установить приложение»), push приходят при закрытом приложении.
- [ ] DNS `s3.DOMAIN` указывает на сервер: админка загружает видео/PDF напрямую в MinIO по presigned URL.
- [ ] Telegram: токен бота и ID канала → админка → Параметры → «Telegram-канал» (бот — админ канала с правом постинга). Фото в постах подтянутся, т.к. медиа публично доступны по `https://DOMAIN/s3/…`.
- [ ] Контакты менеджера заполнены в Параметрах (телефон/telegram/whatsapp/max) — их видит покупатель.
- [ ] Комиссия и антиснайпинг проверены в Параметрах.
- [ ] `JWT_SECRET` задан сильным уникальным значением (`openssl rand -hex 32`) — иначе API не стартует.
- [ ] `TELEGRAM_ADMIN_CHAT_ID` указывает на нужных админов: на эти чаты приходят алерты о входах в админку и работает команда бота `/status`.

## 7. Бэкапы

```bash
chmod +x deploy/backup.sh
crontab -e
# 0 4 * * * cd /opt/auction && ./deploy/backup.sh >> /var/log/hermes-backup.log 2>&1
```

Скрипт кладёт `pg_dump` и архив медиа в `/var/backups/hermes` (хранит 14 дней). Команды восстановления — в комментарии внутри скрипта. Рекомендуется зеркалировать каталог бэкапов на внешний S3/другую машину.

## 8. Обновление версии

```bash
cd /opt/auction
git pull
docker compose -f docker-compose.prod.yml up -d --build   # миграции применятся сами
```

## 9. Эксплуатация

```bash
docker compose -f docker-compose.prod.yml logs -f api     # логи движка (ставки, закрытия, telegram-WARN'ы)
docker compose -f docker-compose.prod.yml ps              # состояние сервисов
docker system prune -f                                    # подчистить старые образы после обновлений
```

Точки внимания: место на диске (видео лотов в volume `hermes_miniodata`), warn-логи `TelegramService` (неверный токен/канал не ломают торги, но посты не уходят).

## Архитектура прода

```
                    ┌─ Caddy (80/443, авто-TLS) ─────────────────┐
  auction.ru ──────▶│  /            → статика клиента (PWA)      │
  admin.auction.ru ▶│  /            → статика админки            │
  s3.auction.ru ───▶│  /*           → minio:9000 (direct upload) │
                    │  /api/*       → api:3000 (префикс срезан)  │
                    │  /socket.io/* → api:3000 (WebSocket)       │
                    │  /s3/*        → minio:9000 (медиа лотов)   │
                    └────────────────────────────────────────────┘
                          api ──▶ postgres · redis · minio
```

Сессионные куки выдаются на `.DOMAIN` (env `COOKIE_DOMAIN`), поэтому один вход через Яндекс работает и на клиенте, и в админке.
