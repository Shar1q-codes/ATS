#!/bin/bash
# Secrets Management Script for Production Deployment

set -e

SECRETS_DIR="/etc/ai-ats/secrets"
BACKUP_DIR="/etc/ai-ats/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
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

# Create secrets directory if it doesn't exist
create_secrets_dir() {
    log "Creating secrets directory..."
    sudo mkdir -p "$SECRETS_DIR"
    sudo chmod 700 "$SECRETS_DIR"
    sudo chown root:root "$SECRETS_DIR"
}

# Generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
}

# Encrypt secret
encrypt_secret() {
    local secret="$1"
    local key_file="$2"
    echo "$secret" | openssl enc -aes-256-cbc -salt -pass file:"$key_file" -base64
}

# Decrypt secret
decrypt_secret() {
    local encrypted_secret="$1"
    local key_file="$2"
    echo "$encrypted_secret" | openssl enc -aes-256-cbc -d -salt -pass file:"$key_file" -base64
}

# Initialize secrets
init_secrets() {
    log "Initializing production secrets..."
    
    create_secrets_dir
    
    # Generate master encryption key
    if [ ! -f "$SECRETS_DIR/master.key" ]; then
        log "Generating master encryption key..."
        openssl rand -base64 32 > "$SECRETS_DIR/master.key"
        sudo chmod 600 "$SECRETS_DIR/master.key"
        sudo chown root:root "$SECRETS_DIR/master.key"
    fi
    
    # Generate database password
    if [ ! -f "$SECRETS_DIR/db_password.enc" ]; then
        log "Generating database password..."
        DB_PASSWORD=$(generate_password)
        encrypt_secret "$DB_PASSWORD" "$SECRETS_DIR/master.key" > "$SECRETS_DIR/db_password.enc"
        sudo chmod 600 "$SECRETS_DIR/db_password.enc"
    fi
    
    # Generate JWT secret
    if [ ! -f "$SECRETS_DIR/jwt_secret.enc" ]; then
        log "Generating JWT secret..."
        JWT_SECRET=$(generate_jwt_secret)
        encrypt_secret "$JWT_SECRET" "$SECRETS_DIR/master.key" > "$SECRETS_DIR/jwt_secret.enc"
        sudo chmod 600 "$SECRETS_DIR/jwt_secret.enc"
    fi
    
    # Generate Redis password
    if [ ! -f "$SECRETS_DIR/redis_password.enc" ]; then
        log "Generating Redis password..."
        REDIS_PASSWORD=$(generate_password)
        encrypt_secret "$REDIS_PASSWORD" "$SECRETS_DIR/master.key" > "$SECRETS_DIR/redis_password.enc"
        sudo chmod 600 "$SECRETS_DIR/redis_password.enc"
    fi
    
    # Generate Grafana admin password
    if [ ! -f "$SECRETS_DIR/grafana_password.enc" ]; then
        log "Generating Grafana admin password..."
        GRAFANA_PASSWORD=$(generate_password)
        encrypt_secret "$GRAFANA_PASSWORD" "$SECRETS_DIR/master.key" > "$SECRETS_DIR/grafana_password.enc"
        sudo chmod 600 "$SECRETS_DIR/grafana_password.enc"
    fi
    
    log "Secrets initialization completed!"
}

# Get decrypted secret
get_secret() {
    local secret_name="$1"
    local secret_file="$SECRETS_DIR/${secret_name}.enc"
    
    if [ ! -f "$secret_file" ]; then
        error "Secret file $secret_file not found"
    fi
    
    decrypt_secret "$(cat $secret_file)" "$SECRETS_DIR/master.key"
}

# Set secret
set_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local secret_file="$SECRETS_DIR/${secret_name}.enc"
    
    log "Setting secret: $secret_name"
    encrypt_secret "$secret_value" "$SECRETS_DIR/master.key" > "$secret_file"
    sudo chmod 600 "$secret_file"
    sudo chown root:root "$secret_file"
}

# Backup secrets
backup_secrets() {
    log "Backing up secrets..."
    
    sudo mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/secrets-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    sudo tar -czf "$BACKUP_FILE" -C "$SECRETS_DIR" .
    sudo chmod 600 "$BACKUP_FILE"
    
    log "Secrets backed up to: $BACKUP_FILE"
}

# Restore secrets
restore_secrets() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file $backup_file not found"
    fi
    
    warn "This will overwrite existing secrets. Continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log "Restore cancelled"
        exit 0
    fi
    
    log "Restoring secrets from: $backup_file"
    
    # Backup current secrets first
    backup_secrets
    
    # Restore from backup
    sudo rm -rf "$SECRETS_DIR"/*
    sudo tar -xzf "$backup_file" -C "$SECRETS_DIR"
    
    log "Secrets restored successfully"
}

# Generate environment file with secrets
generate_env_file() {
    local env_file="$1"
    
    log "Generating environment file: $env_file"
    
    cat > "$env_file" << EOF
# Generated Production Environment File
# Generated on: $(date)

# Database Configuration
DB_PASSWORD_SECRET=$(get_secret "db_password")
JWT_SECRET_KEY=$(get_secret "jwt_secret")
REDIS_PASSWORD=$(get_secret "redis_password")
GRAFANA_ADMIN_PASSWORD_SECRET=$(get_secret "grafana_password")

# External API Keys (set these manually)
OPENAI_API_KEY_SECRET=your_openai_api_key_here
POSTMARK_API_KEY_SECRET=your_postmark_api_key_here
SENTRY_DSN_SECRET=your_sentry_dsn_here
SUPABASE_URL_SECRET=your_supabase_url_here
SUPABASE_SERVICE_KEY_SECRET=your_supabase_service_key_here
SUPABASE_ANON_KEY_SECRET=your_supabase_anon_key_here

# Backup Configuration
BACKUP_S3_BUCKET_NAME=your_backup_bucket
BACKUP_S3_ACCESS_KEY_SECRET=your_s3_access_key
BACKUP_S3_SECRET_KEY_SECRET=your_s3_secret_key
BACKUP_S3_REGION=us-east-1

# CDN Configuration
CDN_ACCESS_KEY_SECRET=your_cdn_access_key
CDN_SECRET_KEY_SECRET=your_cdn_secret_key
EOF
    
    chmod 600 "$env_file"
    log "Environment file generated: $env_file"
    warn "Please update the external API keys in the file manually"
}

# Main function
main() {
    case "${1:-}" in
        "init")
            init_secrets
            ;;
        "get")
            if [ -z "${2:-}" ]; then
                error "Usage: $0 get <secret_name>"
            fi
            get_secret "$2"
            ;;
        "set")
            if [ -z "${2:-}" ] || [ -z "${3:-}" ]; then
                error "Usage: $0 set <secret_name> <secret_value>"
            fi
            set_secret "$2" "$3"
            ;;
        "backup")
            backup_secrets
            ;;
        "restore")
            if [ -z "${2:-}" ]; then
                error "Usage: $0 restore <backup_file>"
            fi
            restore_secrets "$2"
            ;;
        "generate-env")
            if [ -z "${2:-}" ]; then
                error "Usage: $0 generate-env <env_file_path>"
            fi
            generate_env_file "$2"
            ;;
        *)
            echo "Usage: $0 {init|get|set|backup|restore|generate-env}"
            echo ""
            echo "Commands:"
            echo "  init                    Initialize secrets"
            echo "  get <secret_name>       Get decrypted secret"
            echo "  set <name> <value>      Set encrypted secret"
            echo "  backup                  Backup all secrets"
            echo "  restore <backup_file>   Restore secrets from backup"
            echo "  generate-env <file>     Generate environment file with secrets"
            exit 1
            ;;
    esac
}

main "$@"