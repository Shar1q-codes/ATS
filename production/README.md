# Production Deployment Guide

This directory contains all the configuration files and scripts needed for production deployment of the AI-Native ATS.

## Directory Structure

```
production/
├── README.md                    # This file
├── docker-compose.prod.yml      # Production Docker Compose configuration
├── .env.production             # Production environment variables
├── nginx/
│   └── nginx.conf              # Nginx reverse proxy configuration
├── postgres/
│   ├── postgresql.conf         # PostgreSQL production configuration
│   ├── pg_hba.conf            # PostgreSQL authentication configuration
│   └── replica-setup.sh       # Read replica setup script
├── redis/
│   ├── redis-master.conf      # Redis master configuration
│   └── redis-replica.conf     # Redis replica configuration
├── monitoring/
│   ├── prometheus.yml         # Prometheus monitoring configuration
│   ├── loki.yml              # Loki log aggregation configuration
│   └── promtail.yml          # Promtail log collection configuration
└── scripts/
    ├── secrets-manager.sh     # Secrets management script
    ├── backup.sh             # Database and application backup script
    ├── ssl-setup.sh          # SSL certificate setup script
    └── deploy.sh             # Main deployment script
```

## Prerequisites

Before deploying to production, ensure you have:

1. **Server Requirements:**
   - Ubuntu 20.04+ or CentOS 8+ (recommended)
   - Minimum 4GB RAM, 2 CPU cores
   - 50GB+ disk space
   - Docker and Docker Compose installed

2. **Domain and DNS:**
   - Domain name configured
   - DNS records pointing to your server
   - SSL certificate (Let's Encrypt recommended)

3. **External Services:**
   - OpenAI API key
   - Email service (Postmark/SendGrid) API key
   - Supabase account (optional, for managed database)
   - S3-compatible storage for backups

## Quick Start

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd ai-native-ats

# Make scripts executable (Linux/macOS)
chmod +x production/scripts/*.sh

# Initialize secrets
sudo ./production/scripts/secrets-manager.sh init

# Generate environment file with secrets
sudo ./production/scripts/secrets-manager.sh generate-env .env.production
```

### 2. Configure Environment

Edit `.env.production` and update the following variables:

```bash
# Update these with your actual values
OPENAI_API_KEY_SECRET=your_actual_openai_api_key
POSTMARK_API_KEY_SECRET=your_actual_postmark_api_key
SENTRY_DSN_SECRET=your_actual_sentry_dsn
SUPABASE_URL_SECRET=your_actual_supabase_url
SUPABASE_SERVICE_KEY_SECRET=your_actual_supabase_service_key
SUPABASE_ANON_KEY_SECRET=your_actual_supabase_anon_key

# Update domain configuration
CORS_ORIGIN=https://your-actual-domain.com
NEXT_PUBLIC_API_URL=https://api.your-actual-domain.com

# Update backup configuration
BACKUP_S3_BUCKET_NAME=your-backup-bucket
BACKUP_S3_ACCESS_KEY_SECRET=your_s3_access_key
BACKUP_S3_SECRET_KEY_SECRET=your_s3_secret_key
```

### 3. Setup SSL Certificates

```bash
# Setup SSL certificates (requires domain to be pointing to server)
sudo DOMAIN=your-domain.com SSL_EMAIL=admin@your-domain.com ./production/scripts/ssl-setup.sh setup
```

### 4. Deploy Application

```bash
# Full deployment (first time)
sudo ./production/scripts/deploy.sh full
```

## Deployment Commands

### Main Deployment Script

```bash
# Full deployment with backup and rebuild
sudo ./production/scripts/deploy.sh full

# Quick deployment without backup or rebuild
sudo ./production/scripts/deploy.sh quick

# Update deployment with backup but no rebuild
sudo ./production/scripts/deploy.sh update

# Rollback to previous deployment
sudo ./production/scripts/deploy.sh rollback

# Show deployment status
sudo ./production/scripts/deploy.sh status

# Clean up old images and containers
sudo ./production/scripts/deploy.sh cleanup

# Verify deployment without making changes
sudo ./production/scripts/deploy.sh verify
```

### Backup Management

```bash
# Full backup (database, Redis, application, config)
sudo ./production/scripts/backup.sh full

# Database backup only
sudo ./production/scripts/backup.sh database

# Restore database from backup
sudo ./production/scripts/backup.sh restore-db /path/to/backup.sql.gz

# Clean old backups
sudo ./production/scripts/backup.sh cleanup
```

### SSL Certificate Management

```bash
# Setup SSL certificates
sudo ./production/scripts/ssl-setup.sh setup

# Renew SSL certificates
sudo ./production/scripts/ssl-setup.sh renew

# Verify SSL certificate
sudo ./production/scripts/ssl-setup.sh verify

# Check certificate expiration
sudo ./production/scripts/ssl-setup.sh check
```

### Secrets Management

```bash
# Initialize secrets
sudo ./production/scripts/secrets-manager.sh init

# Get a secret
sudo ./production/scripts/secrets-manager.sh get db_password

# Set a secret
sudo ./production/scripts/secrets-manager.sh set api_key "your_api_key"

# Backup secrets
sudo ./production/scripts/secrets-manager.sh backup

# Generate environment file
sudo ./production/scripts/secrets-manager.sh generate-env .env.production
```

## Monitoring and Logging

After deployment, the following monitoring services will be available:

- **Grafana Dashboard:** `http://your-domain.com:3003`
  - Username: `admin`
  - Password: Generated during secrets initialization

- **Prometheus Metrics:** `http://your-domain.com:9090`

- **Application Logs:** Aggregated via Loki and viewable in Grafana

### Key Metrics to Monitor

1. **Application Performance:**
   - Response times
   - Error rates
   - Request throughput

2. **Infrastructure:**
   - CPU and memory usage
   - Disk space
   - Network I/O

3. **Database:**
   - Connection pool usage
   - Query performance
   - Replication lag

4. **AI Services:**
   - OpenAI API usage
   - Parsing success rates
   - Matching accuracy

## Security Considerations

### Network Security

1. **Firewall Configuration:**

   ```bash
   # Allow only necessary ports
   ufw allow 22    # SSH
   ufw allow 80    # HTTP
   ufw allow 443   # HTTPS
   ufw enable
   ```

2. **SSL/TLS Configuration:**
   - TLS 1.2+ only
   - Strong cipher suites
   - HSTS headers
   - Certificate pinning

### Application Security

1. **Environment Variables:**
   - All secrets encrypted at rest
   - No secrets in Docker images
   - Regular secret rotation

2. **Database Security:**
   - Encrypted connections
   - Strong authentication
   - Regular security updates

3. **API Security:**
   - Rate limiting
   - Input validation
   - CORS configuration
   - Security headers

### Access Control

1. **Server Access:**
   - SSH key-based authentication
   - Disable root login
   - Regular security updates

2. **Application Access:**
   - Role-based access control
   - JWT token expiration
   - Session management

## Backup and Recovery

### Automated Backups

Backups are automatically created and include:

1. **Database Backups:**
   - Full PostgreSQL dump
   - Compressed and encrypted
   - Stored locally and in S3

2. **Application Backups:**
   - Configuration files
   - Uploaded files
   - SSL certificates

3. **Backup Schedule:**
   - Daily full backups
   - Retention: 30 days local, 90 days S3
   - Automatic cleanup

### Recovery Procedures

1. **Database Recovery:**

   ```bash
   sudo ./production/scripts/backup.sh restore-db /path/to/backup.sql.gz
   ```

2. **Full System Recovery:**
   - Restore from backup
   - Redeploy application
   - Verify functionality

## Troubleshooting

### Common Issues

1. **Service Won't Start:**

   ```bash
   # Check service logs
   docker-compose -f docker-compose.prod.yml logs service_name

   # Check service status
   docker-compose -f docker-compose.prod.yml ps
   ```

2. **Database Connection Issues:**

   ```bash
   # Check database logs
   docker-compose -f docker-compose.prod.yml logs postgres

   # Test database connection
   docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USERNAME -d $DB_NAME
   ```

3. **SSL Certificate Issues:**

   ```bash
   # Verify certificate
   sudo ./production/scripts/ssl-setup.sh verify

   # Check certificate expiration
   sudo ./production/scripts/ssl-setup.sh check
   ```

### Log Locations

- **Application Logs:** Aggregated in Loki, viewable in Grafana
- **Nginx Logs:** `/var/log/nginx/`
- **System Logs:** `/var/log/syslog`
- **Backup Logs:** `/var/log/backup.log`
- **SSL Renewal Logs:** `/var/log/ssl-renewal.log`

## Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Review monitoring dashboards
   - Check backup integrity
   - Review security logs

2. **Monthly:**
   - Update system packages
   - Rotate secrets
   - Review resource usage

3. **Quarterly:**
   - Security audit
   - Performance optimization
   - Disaster recovery testing

### Update Procedures

1. **Application Updates:**

   ```bash
   sudo ./production/scripts/deploy.sh update
   ```

2. **System Updates:**

   ```bash
   sudo apt update && sudo apt upgrade
   sudo reboot  # if kernel updates
   ```

3. **Docker Updates:**
   ```bash
   sudo ./production/scripts/deploy.sh cleanup
   docker system prune -a
   ```

## Support and Documentation

For additional support:

1. Check application logs in Grafana
2. Review this documentation
3. Check the main project README
4. Contact system administrator

## Security Contacts

- **Security Issues:** security@your-domain.com
- **System Administrator:** admin@your-domain.com
- **Emergency Contact:** +1-XXX-XXX-XXXX
