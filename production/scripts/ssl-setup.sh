#!/bin/bash
# SSL Certificate Setup Script for Production

set -e

# Configuration
DOMAIN="${DOMAIN:-your-domain.com}"
EMAIL="${SSL_EMAIL:-admin@your-domain.com}"
SSL_DIR="/etc/nginx/ssl"
CERTBOT_DIR="/var/www/certbot"

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

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root"
    fi
}

# Install certbot
install_certbot() {
    log "Installing certbot..."
    
    if command -v certbot >/dev/null 2>&1; then
        log "Certbot already installed"
        return 0
    fi
    
    # Install certbot based on OS
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot python3-certbot-nginx
    else
        error "Unsupported operating system"
    fi
    
    log "Certbot installation completed"
}

# Create SSL directories
create_ssl_dirs() {
    log "Creating SSL directories..."
    
    mkdir -p "$SSL_DIR"
    mkdir -p "$CERTBOT_DIR"
    
    chmod 755 "$SSL_DIR"
    chmod 755 "$CERTBOT_DIR"
}

# Generate self-signed certificate for initial setup
generate_self_signed() {
    log "Generating self-signed certificate for initial setup..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/private.key" \
        -out "$SSL_DIR/cert.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    
    chmod 600 "$SSL_DIR/private.key"
    chmod 644 "$SSL_DIR/cert.pem"
    
    log "Self-signed certificate generated"
}

# Obtain Let's Encrypt certificate
obtain_letsencrypt_cert() {
    log "Obtaining Let's Encrypt certificate for $DOMAIN..."
    
    # Stop nginx if running
    if systemctl is-active --quiet nginx; then
        systemctl stop nginx
    fi
    
    # Obtain certificate
    certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN,api.$DOMAIN"
    
    if [ $? -eq 0 ]; then
        log "Let's Encrypt certificate obtained successfully"
        
        # Copy certificates to nginx directory
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/private.key"
        
        chmod 644 "$SSL_DIR/cert.pem"
        chmod 600 "$SSL_DIR/private.key"
        
        log "Certificates copied to nginx directory"
    else
        error "Failed to obtain Let's Encrypt certificate"
    fi
}

# Setup certificate renewal
setup_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

set -e

DOMAIN="${DOMAIN:-your-domain.com}"
SSL_DIR="/etc/nginx/ssl"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Renew certificate
log "Starting certificate renewal..."

certbot renew --quiet --no-self-upgrade

if [ $? -eq 0 ]; then
    log "Certificate renewal successful"
    
    # Copy renewed certificates
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/cert.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/private.key"
    
    chmod 644 "$SSL_DIR/cert.pem"
    chmod 600 "$SSL_DIR/private.key"
    
    # Reload nginx
    if command -v docker >/dev/null 2>&1; then
        docker exec ai-ats-nginx nginx -s reload
    else
        systemctl reload nginx
    fi
    
    log "Nginx reloaded with new certificates"
else
    log "Certificate renewal failed"
    exit 1
fi
EOF
    
    chmod +x /usr/local/bin/renew-ssl.sh
    
    # Create cron job for automatic renewal
    cat > /etc/cron.d/ssl-renewal << EOF
# SSL Certificate Renewal Cron Job
# Runs twice daily at random times to avoid rate limiting

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Renew certificates twice daily
0 2,14 * * * root /usr/local/bin/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
EOF
    
    log "Automatic renewal setup completed"
}

# Verify SSL certificate
verify_certificate() {
    log "Verifying SSL certificate..."
    
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/private.key" ]; then
        error "SSL certificate files not found"
    fi
    
    # Check certificate validity
    if openssl x509 -in "$SSL_DIR/cert.pem" -text -noout >/dev/null 2>&1; then
        log "Certificate is valid"
        
        # Show certificate details
        log "Certificate details:"
        openssl x509 -in "$SSL_DIR/cert.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:)"
    else
        error "Certificate is invalid"
    fi
}

# Test SSL configuration
test_ssl_config() {
    log "Testing SSL configuration..."
    
    # Test with openssl
    if echo | openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" 2>/dev/null | grep -q "Verify return code: 0"; then
        log "SSL configuration test passed"
    else
        warn "SSL configuration test failed - this is normal if the domain is not yet pointing to this server"
    fi
}

# Create DH parameters for enhanced security
create_dhparam() {
    log "Creating DH parameters (this may take a while)..."
    
    if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
        openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
        chmod 644 "$SSL_DIR/dhparam.pem"
        log "DH parameters created"
    else
        log "DH parameters already exist"
    fi
}

# Setup OCSP stapling
setup_ocsp_stapling() {
    log "Setting up OCSP stapling..."
    
    # Download intermediate certificate
    curl -s https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem > "$SSL_DIR/intermediate.pem"
    
    # Create full chain
    cat "$SSL_DIR/cert.pem" "$SSL_DIR/intermediate.pem" > "$SSL_DIR/fullchain.pem"
    
    chmod 644 "$SSL_DIR/fullchain.pem"
    chmod 644 "$SSL_DIR/intermediate.pem"
    
    log "OCSP stapling setup completed"
}

# Main setup function
setup_ssl() {
    log "Starting SSL setup for domain: $DOMAIN"
    
    check_root
    create_ssl_dirs
    install_certbot
    
    # Choose certificate type
    echo "Choose certificate type:"
    echo "1) Let's Encrypt (recommended for production)"
    echo "2) Self-signed (for testing only)"
    read -p "Enter choice (1-2): " choice
    
    case $choice in
        1)
            obtain_letsencrypt_cert
            setup_renewal
            setup_ocsp_stapling
            ;;
        2)
            generate_self_signed
            warn "Self-signed certificate generated - not suitable for production"
            ;;
        *)
            error "Invalid choice"
            ;;
    esac
    
    create_dhparam
    verify_certificate
    
    log "SSL setup completed successfully"
    log "Certificate files:"
    log "  - Certificate: $SSL_DIR/cert.pem"
    log "  - Private key: $SSL_DIR/private.key"
    log "  - DH parameters: $SSL_DIR/dhparam.pem"
    
    if [ "$choice" = "1" ]; then
        log "  - Full chain: $SSL_DIR/fullchain.pem"
        log "  - Intermediate: $SSL_DIR/intermediate.pem"
        log ""
        log "Automatic renewal is configured to run twice daily"
    fi
}

# Renew certificates
renew_certificates() {
    log "Renewing SSL certificates..."
    /usr/local/bin/renew-ssl.sh
}

# Check certificate expiration
check_expiration() {
    log "Checking certificate expiration..."
    
    if [ -f "$SSL_DIR/cert.pem" ]; then
        expiry_date=$(openssl x509 -in "$SSL_DIR/cert.pem" -noout -enddate | cut -d= -f2)
        expiry_timestamp=$(date -d "$expiry_date" +%s)
        current_timestamp=$(date +%s)
        days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        log "Certificate expires on: $expiry_date"
        log "Days until expiry: $days_until_expiry"
        
        if [ $days_until_expiry -lt 30 ]; then
            warn "Certificate expires in less than 30 days!"
        fi
    else
        error "Certificate file not found"
    fi
}

# Main function
main() {
    case "${1:-}" in
        "setup")
            setup_ssl
            ;;
        "renew")
            renew_certificates
            ;;
        "verify")
            verify_certificate
            ;;
        "check")
            check_expiration
            ;;
        "test")
            test_ssl_config
            ;;
        *)
            echo "Usage: $0 {setup|renew|verify|check|test}"
            echo ""
            echo "Commands:"
            echo "  setup    Setup SSL certificates"
            echo "  renew    Renew SSL certificates"
            echo "  verify   Verify SSL certificate"
            echo "  check    Check certificate expiration"
            echo "  test     Test SSL configuration"
            echo ""
            echo "Environment variables:"
            echo "  DOMAIN     Domain name (default: your-domain.com)"
            echo "  SSL_EMAIL  Email for Let's Encrypt (default: admin@your-domain.com)"
            exit 1
            ;;
    esac
}

main "$@"