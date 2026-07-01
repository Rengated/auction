SHELL := /bin/bash

DB_CONTAINER ?= hermes-postgres-1
DB_USER ?= hermes
DB_NAME ?= hermes
BACKUP_DIR ?= backups
BACKUP_FILE = $(BACKUP_DIR)/$(DB_NAME)-db-$(shell date +%Y%m%d-%H%M%S).sql

.PHONY: help up dev build db-backup db-backups db-restore

help:
	@echo "Available commands:"
	@echo "  make up                                Build and start production Docker stack"
	@echo "  make dev                               Start API/web/admin dev servers"
	@echo "  make build                             Build production Docker images"
	@echo "  make db-backup                         Create PostgreSQL SQL dump in $(BACKUP_DIR)/"
	@echo "  make db-backups                        List local DB backups"
	@echo "  make db-restore BACKUP=path CONFIRM=YES Restore SQL dump into local DB"
	@echo ""
	@echo "Optional vars:"
	@echo "  DB_CONTAINER=$(DB_CONTAINER) DB_USER=$(DB_USER) DB_NAME=$(DB_NAME) BACKUP_DIR=$(BACKUP_DIR)"

up:
	@docker compose -f docker-compose.prod.yml up -d --build

dev:
	@pnpm dev

build:
	@docker compose -f docker-compose.prod.yml build

db-backup:
	@mkdir -p "$(BACKUP_DIR)"
	@echo "Creating database backup: $(BACKUP_FILE)"
	@docker exec "$(DB_CONTAINER)" pg_dump -U "$(DB_USER)" -d "$(DB_NAME)" > "$(BACKUP_FILE)"
	@ls -lh "$(BACKUP_FILE)"

db-backups:
	@mkdir -p "$(BACKUP_DIR)"
	@ls -lh "$(BACKUP_DIR)"

db-restore:
	@test -n "$(BACKUP)" || (echo "Usage: make db-restore BACKUP=$(BACKUP_DIR)/file.sql CONFIRM=YES" && exit 1)
	@test -f "$(BACKUP)" || (echo "Backup file not found: $(BACKUP)" && exit 1)
	@test "$(CONFIRM)" = "YES" || (echo "Refusing to restore without CONFIRM=YES" && exit 1)
	@echo "Restoring database $(DB_NAME) from $(BACKUP)"
	@cat "$(BACKUP)" | docker exec -i "$(DB_CONTAINER)" psql -U "$(DB_USER)" -d "$(DB_NAME)"
