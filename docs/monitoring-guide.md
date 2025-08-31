# AI-Native ATS Monitoring and Debugging Guide

## Overview

This guide covers monitoring, debugging, and troubleshooting the AI-Native ATS system. It includes information about logging, health checks, error tracking, and performance monitoring.

## Health Monitoring

### Health Check Endpoints

The system provides several health check endpoints for monitoring:

#### `/api/health` - Comprehensive Health Check

Checks all system components:

- Database connectivity
- Memory usage (heap and RSS)
- Disk storage availability
- External service dependencies

**Response Example:**

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up"
    },
    "memory_rss": {
      "status": "up"
    },
    "storage": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "memory_heap": {
      "status": "up",
      "used": 45678912,
      "limit": 157286400
    },
    "memory_rss": {
      "status": "up",
      "used": 67890123,
      "limit": 157286400
    },
    "storage": {
      "status": "up",
      "used": 0.45,
      "limit": 0.9
    }
  }
}
```

#### `/api/health/ready` - Readiness Check

Verifies the application is ready to serve requests:

- Database connection is active
- Required services are initialized

#### `/api/health/live` - Liveness Check

Confirms the application is alive and responsive:

- Basic memory check
- Application process is running

### Monitoring Integration

#### Kubernetes/Docker Health Checks

```yaml
# Kubernetes deployment example
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

#### Load Balancer Health Checks

Configure your load balancer to use `/api/health/ready` for routing decisions.

## Logging System

### Log Levels

The system uses Winston for structured logging with the following levels:

- **error**: Error events that might still allow the application to continue
- **warn**: Warning messages for potentially harmful situations
- **info**: Informational messages highlighting application progress
- **debug**: Fine-grained informational events for debugging

### Log Configuration

Logs are configured in `src/common/logging/winston.config.ts`:

```typescript
// Console output with colors and timestamps
// File output to logs/error.log (errors only)
// File output to logs/combined.log (all levels)
```

### Log Format

**Console Output:**

```
2024-01-01T12:00:00.000Z [AuthService] info: User login successful
2024-01-01T12:00:01.000Z [ResumeParsingService] error: Failed to parse resume: Invalid file format
```

**File Output (JSON):**

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "User login successful",
  "context": "AuthService",
  "userId": "uuid-here",
  "requestId": "req-uuid-here"
}
```

### Accessing Logs

#### Development Environment

```bash
# View real-time logs
tail -f backend/logs/combined.log

# View error logs only
tail -f backend/logs/error.log

# Search logs
grep "ERROR" backend/logs/combined.log
```

#### Production Environment

- Logs are automatically rotated daily
- Use log aggregation tools like ELK Stack or Splunk
- Configure log shipping to centralized logging service

## Error Tracking with Sentry

### Configuration

Set up Sentry for error tracking:

1. **Environment Variables:**

   ```bash
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   NODE_ENV=production
   ```

2. **Automatic Error Capture:**
   - Unhandled exceptions
   - Promise rejections
   - HTTP errors
   - Custom error events

### Sentry Features Used

#### Error Context

Each error includes:

- User information (if authenticated)
- Request details (method, URL, headers)
- Application state
- Stack trace
- Breadcrumb trail

#### Performance Monitoring

- API endpoint response times
- Database query performance
- External service call duration
- Memory usage patterns

#### Release Tracking

- Deploy notifications
- Error attribution to releases
- Performance regression detection

### Custom Error Tracking

```typescript
// In your service
import { SentryService } from "../common/sentry/sentry.service";

@Injectable()
export class YourService {
  constructor(private sentryService: SentryService) {}

  async someMethod() {
    try {
      // Your code here
    } catch (error) {
      this.sentryService.captureException(error, "YourService.someMethod");
      throw error;
    }
  }
}
```

## Performance Monitoring

### Key Metrics to Monitor

#### Application Metrics

- **Response Time**: API endpoint response times
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Memory Usage**: Heap and RSS memory consumption
- **CPU Usage**: Application CPU utilization

#### Business Metrics

- **Resume Processing Time**: Time to parse and extract data
- **Matching Performance**: Time to calculate fit scores
- **Email Delivery Rate**: Success rate of email sending
- **Database Query Performance**: Slow query identification

### Monitoring Tools Integration

#### Prometheus Metrics

```typescript
// Example metrics collection
import { register, Counter, Histogram } from "prom-client";

const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route"],
});
```

#### Application Performance Monitoring (APM)

- New Relic integration
- DataDog APM
- Elastic APM

## Debugging Tools

### Development Debugging

#### VS Code Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug NestJS",
  "program": "${workspaceFolder}/src/main.ts",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "runtimeArgs": ["-r", "ts-node/register"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### Database Query Debugging

```typescript
// Enable query logging in TypeORM
{
  logging: process.env.NODE_ENV === 'development' ? 'all' : ['error'],
  logger: 'advanced-console',
}
```

### Production Debugging

#### Request Tracing

Each request includes a unique request ID for tracing:

```
X-Request-ID: req-uuid-here
```

#### Correlation IDs

Track requests across services using correlation IDs in logs.

#### Debug Endpoints (Development Only)

```typescript
// Debug routes (only in development)
if (process.env.NODE_ENV === "development") {
  app.use("/debug", debugRoutes);
}
```

## Alert Configuration

### Critical Alerts

#### System Health

- Database connection failures
- High memory usage (>90%)
- High error rate (>5%)
- Service unavailability

#### Business Logic

- Resume parsing failures (>10% failure rate)
- Email delivery failures
- AI service timeouts
- Authentication failures

### Alert Channels

#### Slack Integration

```json
{
  "webhook_url": "https://hooks.slack.com/services/...",
  "channel": "#alerts",
  "username": "ATS-Monitor"
}
```

#### Email Alerts

- Critical system failures
- Daily health summaries
- Weekly performance reports

#### PagerDuty Integration

- 24/7 on-call notifications
- Escalation policies
- Incident management

## Troubleshooting Common Issues

### High Memory Usage

**Symptoms:**

- Slow response times
- Memory health check failures
- Application crashes

**Investigation:**

```bash
# Check memory usage
node --inspect dist/main.js
# Use Chrome DevTools for heap analysis

# Monitor memory in production
pm2 monit
```

**Solutions:**

- Implement memory leak detection
- Optimize database queries
- Add pagination to large data sets
- Configure garbage collection

### Database Connection Issues

**Symptoms:**

- Database health check failures
- Connection timeout errors
- Query execution failures

**Investigation:**

```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC;
```

**Solutions:**

- Increase connection pool size
- Optimize slow queries
- Implement connection retry logic
- Monitor database performance

### AI Service Timeouts

**Symptoms:**

- Resume parsing failures
- Matching service errors
- OpenAI API timeouts

**Investigation:**

- Check OpenAI API status
- Review rate limiting
- Monitor API usage quotas

**Solutions:**

- Implement retry logic with exponential backoff
- Add circuit breaker pattern
- Cache frequently used results
- Optimize prompt engineering

### Email Delivery Issues

**Symptoms:**

- High bounce rates
- Delivery failures
- Spam folder placement

**Investigation:**

- Check email service logs
- Review bounce reports
- Verify DNS records (SPF, DKIM, DMARC)

**Solutions:**

- Implement email validation
- Monitor sender reputation
- Use dedicated IP addresses
- Implement feedback loops

## Maintenance Tasks

### Daily Tasks

- Review error logs
- Check system health metrics
- Monitor API response times
- Verify backup completion

### Weekly Tasks

- Analyze performance trends
- Review security logs
- Update monitoring dashboards
- Clean up old log files

### Monthly Tasks

- Performance optimization review
- Security vulnerability assessment
- Capacity planning analysis
- Disaster recovery testing

## Emergency Procedures

### System Outage Response

1. **Immediate Response:**
   - Check health endpoints
   - Review recent deployments
   - Check external service status

2. **Investigation:**
   - Analyze error logs
   - Check system metrics
   - Identify root cause

3. **Resolution:**
   - Apply hotfix if needed
   - Rollback if necessary
   - Communicate with stakeholders

4. **Post-Incident:**
   - Document incident
   - Conduct post-mortem
   - Implement preventive measures

### Data Recovery Procedures

1. **Backup Verification:**
   - Verify backup integrity
   - Check backup timestamps
   - Test restore procedures

2. **Recovery Process:**
   - Stop application services
   - Restore from backup
   - Verify data integrity
   - Restart services

3. **Validation:**
   - Run health checks
   - Verify functionality
   - Monitor for issues

## Contact Information

### Support Escalation

- **Level 1**: Development team
- **Level 2**: DevOps/Infrastructure team
- **Level 3**: External vendor support

### Emergency Contacts

- **On-call Engineer**: [Contact information]
- **System Administrator**: [Contact information]
- **Product Owner**: [Contact information]
