#!/bin/bash

# Database backup script
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/tradeline_marketplace_$TIMESTAMP.sql"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

echo "📦 Starting database backup..."

# Run pg_dump
docker-compose exec -T postgres pg_dump \
    -U ${DB_USER:-tradeline} \
    -d ${DB_NAME:-tradeline_marketplace} \
    > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

echo "✅ Backup completed: ${BACKUP_FILE}.gz"

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "🧹 Old backups cleaned"
