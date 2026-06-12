#!/usr/bin/env bash
# Бэкап БД и медиа. Запускать из корня репозитория (рядом с docker-compose.prod.yml).
# Крон (ежедневно в 4:00):  0 4 * * *  cd /opt/auction && ./deploy/backup.sh >> /var/log/hermes-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/hermes}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "[$STAMP] postgres dump…"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U hermes --format=custom hermes > "$BACKUP_DIR/db-$STAMP.dump"

echo "[$STAMP] minio (медиа лотов)…"
docker run --rm \
  -v hermes_miniodata:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/media-$STAMP.tar.gz" -C /data .

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete
echo "[$STAMP] готово: $(du -sh "$BACKUP_DIR" | cut -f1) в $BACKUP_DIR"

# Восстановление:
#   БД:    docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U hermes -d hermes --clean < db-XXX.dump
#   Медиа: docker run --rm -v hermes_miniodata:/data -v "$BACKUP_DIR":/backup alpine tar xzf /backup/media-XXX.tar.gz -C /data
