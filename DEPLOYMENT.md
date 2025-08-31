# Deployment Guide

This document provides comprehensive instructions for deploying the AI-Native ATS to production environments.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Environment Setup](#environment-setup)
5. [Deployment Strategies](#deployment-strategies)
6. [Monitoring and Observability](#monitoring-and-observability)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Overview

The AI-Native ATS uses a modern CI/CD pipeline with GitHub Actions for automated testing, building, and deployment. The system supports multiple deployment strategies including blue-green deployments for zero-downtime updates.

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ • Feature dev   │───▶│ • Integration   │───▶│ • Live system   │
│ • Unit tests    │    │ • E2E tests     │    │ • Blue-green    │
│ • Code review   │    │ • Performance   │    │ • Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Infrastructure Requirements

- **Server Specifications:**
  - Minimum: 4GB RAM, 2 CPU cores, 50GB storage
  - Recommended: 8GB RAM, 4 CPU cores, 100GB storage
  - Operating System: Ubuntu 20.04+ or CentOS 8+

- **External Services:**
  - Domain name with DNS control
  - SSL certificate (Let's Encrypt recommended)
  - Container registry access (GitHub Container Registry)
  - Email service (Postmark/SendGrid)
  - OpenAI API access
  - Monitoring service (optional: Sentry, DataDog)

### Required Secrets

Configure the following secrets in your GitHub repository:

#### Staging Environment

```bash
STAGING_HOST=staging.your-domain.com
STAGING_USER=deploy
STAGING_SSH_PRIVATE_KEY=<ssh-private-key>
STAGING_DATABASE_URL=postgresql://user:pass@host:5432/db
STAGING_REDIS_URL=redis://host:6379
STAGING_JWT_SECRET=<jwt-secret>
STAGING_OPENAI_API_KEY=<openai-key>
STAGING_POSTMARK_API_KEY=<postmark-key>
STAGING_SUPABASE_URL=<supabase-url>
STAGING_SUPABASE_ANON_KEY=<supabase-anon-key>
STAGING_SENTRY_DSN=<sentry-dsn>
STAGING_API_URL=https://api-staging.your-domain.com
STAGING_FRONTEND_URL=https://staging.your-domain.com
```

#### Production Environment

```bash
PRODUCTION_HOST=your-domain.com
PRODUCTION_USER=deploy
PRODUCTION_SSH_PRIVATE_KEY=<ssh-private-key>
PRODUCTION_KNOWN_HOSTS=<known-hosts-content>
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:5432/db
PRODUCTION_DATABASE_READ_URL=postgresql://user:pass@replica:5432/db
PRODUCTION_REDIS_URL=redis://host:6379
PRODUCTION_JWT_SECRET=<jwt-secret>
PRODUCTION_OPENAI_API_KEY=<openai-key>
PRODUCTION_POSTMARK_API_KEY=<postmark-key>
PRODUCTION_SUPABASE_URL=<supabase-url>
PRODUCTION_SUPABASE_ANON_KEY=<supabase-anon-key>
PRODUCTION_SENTRY_DSN=<sentry-dsn>
PRODUCTION_API_URL=https://api.your-domain.com
PRODUCTION_FRONTEND_URL=https://your-domain.com
```

#### Additional Secrets

```bash
GITHUB_TOKEN=<github-token>
SNYK_TOKEN=<snyk-token>
SONAR_TOKEN=<sonar-token>
SLACK_WEBHOOK_URL=<slack-webhook>
SECURITY_SLACK_WEBHOOK_URL=<security-slack-webhook>
PERFORMANCE_SLACK_WEBHOOK_URL=<performance-slack-webhook>
```

## CI/CD Pipeline

### Workflow Overview

The CI/CD pipeline consists of several workflows:

1. **Continuous Integration (`ci.yml`)**
   - Triggered on: Push to main/develop, Pull requests
   - Actions: Lint, test, security scan, build verification

2. **Staging Deployment (`cd-staging.yml`)**
   - Triggered on: Push to develop branch
   - Actions: Build images, deploy to staging, run smoke tests

3. **Production Deployment (`cd-production.yml`)**
   - Triggered on: Push to main branch, Git tags
   - Actions: Blue-green deployment, comprehensive testing

4. **Security Scanning (`security-scan.yml`)**
   - Triggered on: Schedule (daily), Push, Pull requests
   - Actions: Dependency scan, container scan, SAST, secret scan

5. **Dependency Updates (`dependency-update.yml`)**
   - Triggered on: Schedule (weekly)
   - Actions: Automated dependency updates, security patches

6. **Performance Testing (`performance-test.yml`)**
   - Triggered on: Schedule (daily), Performance label
   - Actions: Load testing, performance profiling

### Pipeline Stages

#### 1. Code Quality and Testing

```yaml
# Runs on every push and PR
- Linting (ESLint, Prettier)
- Unit tests (Jest)
- Integration tests (Supertest)
- E2E tests (Playwright)
- Security scanning (Snyk, Trivy)
- Code coverage reporting
```

#### 2. Build and Package

```yaml
# Creates production-ready artifacts
- Docker image building
- Multi-architecture support (amd64, arm64)
- Image signing with Cosign
- Container registry push
- Vulnerability scanning
```

#### 3. Deployment

```yaml
# Environment-specific deployment
- Database migrations
- Blue-green deployment
- Health checks
- Smoke tests
- Traffic switching
- Rollback on failure
```

#### 4. Post-Deployment

```yaml
# Verification and monitoring
- Performance testing
- Security validation
- Monitoring setup
- Notification dispatch
- Documentation updates
```

## Environment Setup

### Local Development

1. **Clone Repository**

   ```bash
   git clone <repository-url>
   cd ai-native-ats
   ```

2. **Environment Configuration**

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit environment files with your values
   ```

3. **Start Development Environment**
   ```bash
   docker-compose up -d
   ```

### Staging Environment

1. **Server Preparation**

   ```bash
   # Install Docker and Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo usermod -aG docker $USER

   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **SSH Key Setup**

   ```bash
   # Generate SSH key for deployment
   ssh-keygen -t ed25519 -C "deploy@staging"

   # Add public key to server
   ssh-copy-id deploy@staging.your-domain.com
   ```

3. **DNS Configuration**
   ```bash
   # Point staging subdomain to server
   staging.your-domain.com -> SERVER_IP
   api-staging.your-domain.com -> SERVER_IP
   ```

### Production Environment

1. **Infrastructure Setup**

   ```bash
   # Use production/scripts/deploy.sh for automated setup
   sudo ./production/scripts/deploy.sh full
   ```

2. **SSL Certificate Setup**

   ```bash
   # Setup Let's Encrypt certificates
   sudo DOMAIN=your-domain.com ./production/scripts/ssl-setup.sh setup
   ```

3. **Secrets Management**
   ```bash
   # Initialize production secrets
   sudo ./production/scripts/secrets-manager.sh init
   sudo ./production/scripts/secrets-manager.sh generate-env .env.production
   ```

## Deployment Strategies

### Blue-Green Deployment

The production deployment uses a blue-green strategy for zero-downtime updates:

1. **Current State**: Blue environment serves traffic
2. **Deployment**: Deploy to Green environment
3. **Testing**: Run health checks and smoke tests on Green
4. **Switch**: Update load balancer to point to Green
5. **Cleanup**: Stop Blue environment after successful switch

```mermaid
graph LR
    A[Load Balancer] --> B[Blue Environment]
    A -.-> C[Green Environment]

    D[New Deployment] --> C
    E[Health Checks] --> C
    F[Traffic Switch] --> A
    G[Cleanup] --> B
```

### Rolling Deployment

For staging environments, a rolling deployment strategy is used:

1. **Update**: Pull new images
2. **Replace**: Replace containers one by one
3. **Verify**: Health check each new container
4. **Continue**: Proceed to next container

### Rollback Strategy

Automatic rollback is triggered on:

- Health check failures
- Smoke test failures
- Performance degradation
- Manual trigger

```bash
# Manual rollback
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/owner/repo/actions/workflows/cd-production.yml/dispatches \
  -d '{"ref":"main","inputs":{"rollback":"true"}}'
```

## Monitoring and Observability

### Application Monitoring

1. **Health Checks**

   ```bash
   # API health endpoint
   curl https://api.your-domain.com/api/health

   # Frontend health endpoint
   curl https://your-domain.com/api/health
   ```

2. **Metrics Collection**
   - Prometheus for metrics collection
   - Grafana for visualization
   - Custom dashboards for business metrics

3. **Log Aggregation**
   - Loki for log collection
   - Promtail for log shipping
   - Structured logging with correlation IDs

4. **Error Tracking**
   - Sentry for error monitoring
   - Real-time error notifications
   - Performance monitoring

### Infrastructure Monitoring

1. **System Metrics**
   - CPU, memory, disk usage
   - Network I/O
   - Container health

2. **Database Monitoring**
   - Query performance
   - Connection pool usage
   - Replication lag

3. **External Service Monitoring**
   - OpenAI API usage and latency
   - Email service delivery rates
   - Third-party service availability

### Alerting

Configure alerts for:

- High error rates (>1%)
- Slow response times (>2s p95)
- High resource usage (>80%)
- Failed deployments
- Security incidents

## Security Considerations

### Deployment Security

1. **Image Security**
   - Base image vulnerability scanning
   - Multi-stage builds to reduce attack surface
   - Non-root user execution
   - Image signing with Cosign

2. **Secrets Management**
   - Encrypted secrets at rest
   - Secrets rotation policy
   - No secrets in container images
   - Environment-specific secret isolation

3. **Network Security**
   - TLS 1.3 for all communications
   - Network segmentation
   - Firewall configuration
   - VPN access for management

4. **Access Control**
   - SSH key-based authentication
   - Role-based access control
   - Audit logging
   - Multi-factor authentication

### Runtime Security

1. **Container Security**
   - Read-only root filesystem
   - Resource limits
   - Security contexts
   - Regular security updates

2. **Application Security**
   - Input validation
   - SQL injection prevention
   - XSS protection
   - CSRF protection

3. **Data Protection**
   - Encryption at rest
   - Encryption in transit
   - Data anonymization
   - GDPR compliance

## Troubleshooting

### Common Issues

1. **Deployment Failures**

   ```bash
   # Check deployment logs
   kubectl logs -f deployment/ai-ats-backend

   # Check service status
   kubectl get pods -l app=ai-ats

   # Describe problematic pods
   kubectl describe pod <pod-name>
   ```

2. **Database Connection Issues**

   ```bash
   # Test database connectivity
   docker exec -it postgres-container psql -U username -d database

   # Check connection pool
   curl https://api.your-domain.com/api/health/db
   ```

3. **Performance Issues**

   ```bash
   # Check resource usage
   docker stats

   # Monitor response times
   curl -w "@curl-format.txt" -o /dev/null -s https://api.your-domain.com/api/health
   ```

### Debugging Steps

1. **Check Logs**

   ```bash
   # Application logs
   docker-compose logs -f backend frontend

   # System logs
   journalctl -u docker -f
   ```

2. **Verify Configuration**

   ```bash
   # Check environment variables
   docker exec backend env | grep -E "(DATABASE|REDIS|JWT)"

   # Verify secrets
   ./production/scripts/secrets-manager.sh get db_password
   ```

3. **Test Connectivity**

   ```bash
   # Test external services
   curl -I https://api.openai.com/v1/models

   # Test internal services
   docker exec backend curl -f http://postgres:5432
   ```

### Recovery Procedures

1. **Service Recovery**

   ```bash
   # Restart services
   docker-compose restart backend frontend

   # Full redeployment
   ./production/scripts/deploy.sh quick
   ```

2. **Database Recovery**

   ```bash
   # Restore from backup
   ./production/scripts/backup.sh restore-db /path/to/backup.sql.gz
   ```

3. **Rollback Deployment**
   ```bash
   # Automatic rollback via GitHub Actions
   # Or manual rollback
   ./production/scripts/deploy.sh rollback
   ```

### Support Contacts

- **Technical Issues**: tech-support@your-domain.com
- **Security Issues**: security@your-domain.com
- **Emergency**: +1-XXX-XXX-XXXX

### Useful Commands

```bash
# Check deployment status
./production/scripts/deploy.sh status

# View recent logs
docker-compose logs --tail=100 -f

# Monitor resource usage
watch docker stats

# Test API endpoints
curl -f https://api.your-domain.com/api/health

# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Backup database
./production/scripts/backup.sh database

# Update secrets
./production/scripts/secrets-manager.sh set api_key "new-value"
```

## Best Practices

1. **Always test in staging first**
2. **Use feature flags for risky changes**
3. **Monitor deployments closely**
4. **Keep rollback procedures ready**
5. **Document all changes**
6. **Regular security updates**
7. **Backup before major changes**
8. **Use infrastructure as code**
9. **Implement proper logging**
10. **Regular disaster recovery testing**
