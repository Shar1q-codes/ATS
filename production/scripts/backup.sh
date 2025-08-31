#!/bin/bash
# Database and Application Backup Script

set -e

# Configuration
BACKUP_DIR="/var/backups/ai-ats"
S3_BUCKET="${BACKUP_S3_BUCKET:-ai-ats-backups}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
}

# Backup PostgreSQL database
backup_database() {
    log "Starting database backup..."
    
    local backup_file="$BACKUP_DIR/postgres-backup-$DATE.sql.gz"
    
    # Create database dump
    docker exec ai-ats-postgres-prod pg_dump -U "$DB_USERNAME" -d "$DB_NAME" | gzip > "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "Database backup completed: $backup_file"
        echo "$backup_file"
    else
        error "Database backup failed"
    fi
}

# Backup Redis data
backup_redis() {
    log "Starting Redis backup..."
    
    local backup_file="$BACKUP_DIR/redis-backup-$DATE.rdb"
    
    # Create Redis backup
    docker exec ai-ats-redis-master redis-cli BGSAVE
    
    # Wait for backup to complete
    while [ "$(docker exec ai-ats-redis-master redis-cli LASTSAVE)" = "$(docker exec ai-ats-redis-master redis-cli LASTSAVE)" ]; do
        sleep 1
    done
    
    # Copy backup file
    docker cp ai-ats-redis-master:/data/dump.rdb "$backup_file"
    
    if [ $? -eq 0 ]; then
        log "Redis backup completed: $backup_file"
        echo "$backup_file"
    else
        error "Redis backup failed"
    fi
}

# Backup application files
backup_application() {
    log "Starting application backup..."
    
    local backup_file="$BACKUP_DIR/application-backup-$DATE.tar.gz"
    
    # Create application backup (excluding node_modules and logs)
    tar -czf "$backup_file" \
        --exclude="node_modules" \
        --exclude="*.log" \
        --exclude=".git" \
        --exclude="dist" \
        --exclude=".next" \
        -C / \
        app/
    
    if [ $? -eq 0 ]; then
        log "Application backup completed: $backup_file"
        echo "$backup_file"
    else
        error "Application backup failed"
    fi
}

# Backup configuration files
backup_config() {
    log "Starting configuration backup..."
    
    local backup_file="$BACKUP_DIR/config-backup-$DATE.tar.gz"
    
    # Create configuration backup
    tar -czf "$backup_file" \
        -C / \
        etc/ai-ats/ \
        etc/nginx/ \
        etc/ssl/
    
    if [ $? -eq 0 ]; then
        log "Configuration backup completed: $backup_file"
        echo "$backup_file"
    else
        error "Configuration backup failed"
    fi
}

# Upload to S3
upload_to_s3() {
    local file="$1"
    local s3_key="$(basename "$file")"
    
    log "Uploading $file to S3..."
    
    if command -v aws >/dev/null 2>&1; then
        aws s3 cp "$file" "s3://$S3_BUCKET/$s3_key" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256
        
        if [ $? -eq 0 ]; then
            log "Upload completed: s3://$S3_BUCKET/$s3_key"
        else
            warn "Upload failed for $file"
        fi
    else
        warn "AWS CLI not found, skipping S3 upload"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
    
    # Clean S3 backups if AWS CLI is available
    if command -v aws >/dev/null 2>&1; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        aws s3 ls "s3://$S3_BUCKET/" | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $1}')
            local file_name=$(echo "$line" | awk '{print $4}')
            
            if [[ "$file_date" < "$cutoff_date" ]]; then
                log "Deleting old S3 backup: $file_name"
                aws s3 rm "s3://$S3_BUCKET/$file_name"
            fi
        done
    fi
    
    log "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity: $backup_file"
    
    case "$backup_file" in
        *.sql.gz)
            # Verify SQL backup
            if gzip -t "$backup_file"; then
                log "SQL backup verification passed"
                return 0
            else
                error "SQL backup verification failed"
            fi
            ;;
        *.tar.gz)
            # Verify tar backup
            if tar -tzf "$backup_file" >/dev/null; then
                log "Tar backup verification passed"
                return 0
            else
                error "Tar backup verification failed"
            fi
            ;;
        *.rdb)
            # Verify Redis backup
            if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
                log "Redis backup verification passed"
                return 0
            else
                error "Redis backup verification failed"
            fi
            ;;
        *)
            warn "Unknown backup format, skipping verification"
            return 0
            ;;
    esac
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send email notification if configured
    if [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        echo "$message" | mail -s "AI-ATS Backup $status" "$NOTIFICATION_EMAIL"
    fi
    
    # Send Slack notification if configured
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"AI-ATS Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Full backup
full_backup() {
    log "Starting full backup process..."
    
    create_backup_dir
    
    local backup_files=()
    local failed_backups=()
    
    # Backup database
    if db_backup=$(backup_database); then
        verify_backup "$db_backup"
        backup_files+=("$db_backup")
        upload_to_s3 "$db_backup"
    else
        failed_backups+=("database")
    fi
    
    # Backup Redis
    if redis_backup=$(backup_redis); then
        verify_backup "$redis_backup"
        backup_files+=("$redis_backup")
        upload_to_s3 "$redis_backup"
    else
        failed_backups+=("redis")
    fi
    
    # Backup application
    if app_backup=$(backup_application); then
        verify_backup "$app_backup"
        backup_files+=("$app_backup")
        upload_to_s3 "$app_backup"
    else
        failed_backups+=("application")
    fi
    
    # Backup configuration
    if config_backup=$(backup_config); then
        verify_backup "$config_backup"
        backup_files+=("$config_backup")
        upload_to_s3 "$config_backup"
    else
        failed_backups+=("configuration")
    fi
    
    # Clean old backups
    cleanup_old_backups
    
    # Report results
    if [ ${#failed_backups[@]} -eq 0 ]; then
        log "Full backup completed successfully"
        log "Backup files created: ${#backup_files[@]}"
        send_notification "SUCCESS" "Full backup completed successfully. Files: ${backup_files[*]}"
    else
        error_msg="Backup completed with errors. Failed: ${failed_backups[*]}"
        warn "$error_msg"
        send_notification "PARTIAL" "$error_msg"
    fi
}

# Restore database
restore_database() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    warn "This will overwrite the current database. Continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log "Restore cancelled"
        exit 0
    fi
    
    log "Restoring database from: $backup_file"
    
    # Stop application containers
    docker-compose -f docker-compose.prod.yml stop backend frontend
    
    # Restore database
    zcat "$backup_file" | docker exec -i ai-ats-postgres-prod psql -U "$DB_USERNAME" -d "$DB_NAME"
    
    if [ $? -eq 0 ]; then
        log "Database restore completed successfully"
        
        # Restart application containers
        docker-compose -f docker-compose.prod.yml start backend frontend
    else
        error "Database restore failed"
    fi
}

# Main function
main() {
    case "${1:-}" in
        "full")
            full_backup
            ;;
        "database")
            create_backup_dir
            backup_database
            ;;
        "redis")
            create_backup_dir
            backup_redis
            ;;
        "application")
            create_backup_dir
            backup_application
            ;;
        "config")
            create_backup_dir
            backup_config
            ;;
        "restore-db")
            if [ -z "${2:-}" ]; then
                error "Usage: $0 restore-db <backup_file>"
            fi
            restore_database "$2"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {full|database|redis|application|config|restore-db|cleanup}"
            echo ""
            echo "Commands:"
            echo "  full                    Perform full backup"
            echo "  database                Backup database only"
            echo "  redis                   Backup Redis only"
            echo "  application             Backup application files only"
            echo "  config                  Backup configuration files only"
            echo "  restore-db <file>       Restore database from backup"
            echo "  cleanup                 Clean old backups"
            exit 1
            ;;
    esac
}

main "$@"