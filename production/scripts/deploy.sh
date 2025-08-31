#!/bin/bash
# Production Deployment Script for AI-Native ATS

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env.production"
BACKUP_DIR="/var/backups/ai-ats"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker >/dev/null 2>&1; then
        error "Docker is not installed"
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "Docker Compose is not installed"
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file not found: $ENV_FILE"
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
    fi
    
    log "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables..."
    
    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Validate required variables
    required_vars=(
        "DB_USERNAME"
        "DB_PASSWORD_SECRET"
        "DB_NAME"
        "JWT_SECRET_KEY"
        "REDIS_PASSWORD"
        "OPENAI_API_KEY_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    log "Environment variables loaded successfully"
}

# Create backup before deployment
create_pre_deployment_backup() {
    log "Creating pre-deployment backup..."
    
    if [ -f "$SCRIPT_DIR/backup.sh" ]; then
        bash "$SCRIPT_DIR/backup.sh" full
    else
        warn "Backup script not found, skipping backup"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" pull
    
    log "Images pulled successfully"
}

# Build application images
build_images() {
    log "Building application images..."
    
    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    log "Images built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    wait_for_service "postgres" "5432"
    
    # Run migrations
    docker-compose -f "$COMPOSE_FILE" exec -T backend npm run migration:run
    
    if [ $? -eq 0 ]; then
        log "Database migrations completed successfully"
    else
        error "Database migrations failed"
    fi
}

# Wait for service to be ready
wait_for_service() {
    local service="$1"
    local port="$2"
    local max_attempts=30
    local attempt=1
    
    log "Waiting for $service to be ready on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T "$service" nc -z localhost "$port" 2>/dev/null; then
            log "$service is ready"
            return 0
        fi
        
        info "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep 10
        ((attempt++))
    done
    
    error "$service failed to become ready after $max_attempts attempts"
}

# Health check
health_check() {
    local service="$1"
    local endpoint="$2"
    local max_attempts=10
    local attempt=1
    
    log "Performing health check for $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$endpoint" >/dev/null 2>&1; then
            log "$service health check passed"
            return 0
        fi
        
        info "Attempt $attempt/$max_attempts: $service health check failed..."
        sleep 5
        ((attempt++))
    done
    
    error "$service health check failed after $max_attempts attempts"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Start infrastructure services first
    log "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis-master redis-replica
    
    # Wait for infrastructure to be ready
    wait_for_service "postgres" "5432"
    wait_for_service "redis-master" "6379"
    
    # Run database migrations
    run_migrations
    
    # Start application services
    log "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d backend
    
    # Wait for backend to be ready
    wait_for_service "backend" "3001"
    health_check "backend" "http://localhost:3001/api/health"
    
    # Start frontend
    log "Starting frontend service..."
    docker-compose -f "$COMPOSE_FILE" up -d frontend
    
    # Wait for frontend to be ready
    wait_for_service "frontend" "3000"
    health_check "frontend" "http://localhost:3000/api/health"
    
    # Start reverse proxy
    log "Starting reverse proxy..."
    docker-compose -f "$COMPOSE_FILE" up -d nginx
    
    # Start monitoring services
    log "Starting monitoring services..."
    docker-compose -f "$COMPOSE_FILE" up -d prometheus grafana loki promtail
    
    log "All services deployed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check service status
    local services=("postgres" "redis-master" "backend" "frontend" "nginx")
    
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            log "$service is running"
        else
            error "$service is not running"
        fi
    done
    
    # Check application endpoints
    health_check "application" "https://localhost/health"
    health_check "api" "https://localhost/api/health"
    
    log "Deployment verification completed successfully"
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore from backup if available
    local latest_backup=$(ls -t "$BACKUP_DIR"/postgres-backup-*.sql.gz 2>/dev/null | head -n1)
    
    if [ -n "$latest_backup" ]; then
        log "Restoring from backup: $latest_backup"
        bash "$SCRIPT_DIR/backup.sh" restore-db "$latest_backup"
    else
        warn "No backup found for rollback"
    fi
    
    log "Rollback completed"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo ""
    
    # Show service status
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    
    # Show resource usage
    log "Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
    
    # Show logs summary
    log "Recent Logs (last 10 lines):"
    docker-compose -f "$COMPOSE_FILE" logs --tail=10
}

# Clean up old images and containers
cleanup() {
    log "Cleaning up old images and containers..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log "Cleanup completed"
}

# Full deployment
full_deploy() {
    log "Starting full deployment process..."
    
    check_prerequisites
    load_environment
    create_pre_deployment_backup
    pull_images
    build_images
    deploy_services
    verify_deployment
    cleanup
    
    log "Full deployment completed successfully!"
    log ""
    log "Application URLs:"
    log "  - Frontend: https://your-domain.com"
    log "  - API: https://api.your-domain.com"
    log "  - Grafana: http://your-domain.com:3003"
    log "  - Prometheus: http://your-domain.com:9090"
    log ""
    log "Next steps:"
    log "  1. Update DNS records to point to this server"
    log "  2. Configure SSL certificates with: ./ssl-setup.sh setup"
    log "  3. Set up monitoring alerts"
    log "  4. Configure backup schedule"
}

# Quick deployment (no backup, no image rebuild)
quick_deploy() {
    log "Starting quick deployment process..."
    
    check_prerequisites
    load_environment
    pull_images
    
    # Restart services
    docker-compose -f "$COMPOSE_FILE" down
    deploy_services
    verify_deployment
    
    log "Quick deployment completed successfully!"
}

# Update deployment (with backup but no full rebuild)
update_deploy() {
    log "Starting update deployment process..."
    
    check_prerequisites
    load_environment
    create_pre_deployment_backup
    pull_images
    
    # Rolling update
    docker-compose -f "$COMPOSE_FILE" up -d --force-recreate
    verify_deployment
    cleanup
    
    log "Update deployment completed successfully!"
}

# Main function
main() {
    case "${1:-}" in
        "full")
            full_deploy
            ;;
        "quick")
            quick_deploy
            ;;
        "update")
            update_deploy
            ;;
        "rollback")
            rollback_deployment
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "verify")
            check_prerequisites
            load_environment
            verify_deployment
            ;;
        *)
            echo "Usage: $0 {full|quick|update|rollback|status|cleanup|verify}"
            echo ""
            echo "Commands:"
            echo "  full      Full deployment with backup and rebuild"
            echo "  quick     Quick deployment without backup or rebuild"
            echo "  update    Update deployment with backup but no rebuild"
            echo "  rollback  Rollback to previous deployment"
            echo "  status    Show deployment status"
            echo "  cleanup   Clean up old images and containers"
            echo "  verify    Verify deployment without making changes"
            echo ""
            echo "Examples:"
            echo "  $0 full     # First time deployment"
            echo "  $0 update   # Regular updates"
            echo "  $0 quick    # Emergency fixes"
            exit 1
            ;;
    esac
}

main "$@"