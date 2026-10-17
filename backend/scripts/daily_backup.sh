#!/bin/bash
# ==============================================================================
# OneClick CRM - Automated Daily MongoDB Backup Script
# ==============================================================================

# Directory to save backups on the VPS
BACKUP_DIR="/var/backups/oneclick_mongodb"
mkdir -p "$BACKUP_DIR"

# Timestamp for the filename
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.gz"

# Path to backend .env
ENV_FILE="/var/www/oneclick/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "[Backup Error] .env not found at $ENV_FILE"
    exit 1
fi

MONGO_URI=$(grep -E "^MONGO_URI=" "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$MONGO_URI" ]; then
    echo "[Backup Error] MONGO_URI not found in $ENV_FILE"
    exit 1
fi

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    echo "[Backup] mongodump not found, installing mongo-tools..."
    apt-get update -y && apt-get install -y mongo-tools
fi

echo "[Backup] Starting backup at $(date)..."
mongodump --uri="$MONGO_URI" --archive="$BACKUP_FILE" --gzip

if [ $? -eq 0 ]; then
    echo "[Backup] ✓ Successfully created backup: $BACKUP_FILE"
    
    # ─── CLOUDFLARE R2 CLOUD UPLOAD ──────────────────────────────────────────
    if command -v rclone &> /dev/null && rclone listremotes | grep -q "^r2:"; then
        echo "[Backup] Uploading to Cloudflare R2 bucket (oneclick-backups)..."
        rclone copy "$BACKUP_FILE" r2:oneclick-backups/
        if [ $? -eq 0 ]; then
            echo "[Backup] ✓ Successfully uploaded to Cloudflare R2!"
            # Keep 30 days of backups in Cloudflare R2
            rclone delete --min-age 30d r2:oneclick-backups/
        else
            echo "[Backup Warning] Failed to upload to Cloudflare R2."
        fi
    fi
    # ─────────────────────────────────────────────────────────────────────────

    # Keep last 7 days of local backups, remove older to save disk space
    find "$BACKUP_DIR" -type f -name "backup_*.gz" -mtime +7 -delete
    echo "[Backup] ✓ Removed local backups older than 7 days."
else
    echo "[Backup Error] mongodump failed."
    exit 1
fi

