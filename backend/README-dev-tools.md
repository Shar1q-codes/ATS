# Development Tools and API Documentation

This document describes the development tools, monitoring, and API testing capabilities available in the AI-Native ATS system.

## Available Tools

### 1. Swagger/OpenAPI Documentation

- **URL**: `http://localhost:3001/api/docs`
- **Description**: Interactive API documentation with request/response examples
- **Features**:
  - Try out API endpoints directly
  - View request/response schemas
  - Authentication support
  - Download OpenAPI specification

### 2. API Testing Interface

- **URL**: `http://localhost:3001/api-tester.html`
- **Description**: Custom web-based API testing tool
- **Features**:
  - Manual request builder
  - Pre-built request templates
  - Authentication management
  - File upload testing
  - Response formatting

### 3. Health Monitoring

- **Health Check**: `http://localhost:3001/api/health`
- **Readiness**: `http://localhost:3001/api/health/ready`
- **Liveness**: `http://localhost:3001/api/health/live`
- **Features**:
  - Database connectivity
  - Memory usage monitoring
  - Disk space monitoring
  - Service dependency checks

### 4. Error Tracking (Sentry)

- **Configuration**: Set `SENTRY_DSN` environment variable
- **Features**:
  - Automatic error capture
  - Performance monitoring
  - User context tracking
  - Release tracking

### 5. Logging System

- **Console Logs**: Colored output with timestamps
- **File Logs**:
  - `logs/combined.log` - All log levels
  - `logs/error.log` - Error logs only
- **Features**:
  - Structured JSON logging
  - Request correlation IDs
  - Contextual information

## Getting Started

### 1. Environment Setup

Create a `.env` file with the following variables:

```bash
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/ai_native_ats
JWT_SECRET=your_super_secret_jwt_key_here
OPENAI_API_KEY=your_openai_api_key

# Optional - Monitoring
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info

# Optional - Email
POSTMARK_API_KEY=your_postmark_api_key
```

### 2. Start the Application

```bash
# Development mode with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run start:prod
```

### 3. Access Development Tools

Once the application is running:

1. **API Documentation**: Visit `http://localhost:3001/api/docs`
2. **API Tester**: Visit `http://localhost:3001/api-tester.html`
3. **Health Check**: Visit `http://localhost:3001/api/health`

## Using the API Tester

### Authentication

1. Go to the "Authentication" tab
2. Enter email and password
3. Click "Login" to get JWT token
4. Token is automatically stored and used for subsequent requests

### Quick Actions

- **Quick Login**: Login with default test credentials
- **Health Check**: Test system health
- **Clear Token**: Remove authentication token
- **Clear Response**: Clear the response area

### Manual Requests

1. Select HTTP method (GET, POST, PUT, PATCH, DELETE)
2. Enter endpoint path (e.g., `/candidates`)
3. Add custom headers if needed (JSON format)
4. Add request body for POST/PUT/PATCH requests
5. Click "Send Request"

### Pre-built Templates

Use the tabs for common operations:

- **Job Management**: Create job families and templates
- **Candidates**: Manage candidate data and resume uploads
- **Applications**: Handle application pipeline

## Postman Collections

Import the provided Postman collections for comprehensive API testing:

1. **Collection**: `postman/AI-Native-ATS.postman_collection.json`
2. **Environment**: `postman/AI-Native-ATS.postman_environment.json`

### Postman Setup

1. Import both files into Postman
2. Select the "AI-Native ATS Environment"
3. Run the "Login" request to set authentication token
4. Use other requests with automatic authentication

## Monitoring and Debugging

### Log Analysis

```bash
# View real-time logs
tail -f logs/combined.log

# Search for errors
grep "ERROR" logs/combined.log

# Filter by service
grep "ResumeParsingService" logs/combined.log
```

### Health Monitoring

```bash
# Check system health
curl http://localhost:3001/api/health

# Check readiness (for load balancers)
curl http://localhost:3001/api/health/ready

# Check liveness (for container orchestration)
curl http://localhost:3001/api/health/live
```

### Performance Monitoring

The system includes request logging with response times:

- All HTTP requests are logged with duration
- Slow queries are identified
- Memory usage is monitored
- Error rates are tracked

### Sentry Integration

When configured, Sentry provides:

- Automatic error capture
- Performance monitoring
- User session tracking
- Release tracking

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

### Integration Tests

```bash
# Run end-to-end tests
npm run test:e2e
```

### API Testing

```bash
# Test specific endpoints
curl -X GET http://localhost:3001/api/health
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Development Workflow

### 1. Feature Development

1. Create feature branch
2. Implement functionality
3. Add unit tests
4. Test with API tester or Postman
5. Update API documentation
6. Create pull request

### 2. API Changes

1. Update DTOs and validation
2. Modify controllers and services
3. Update Swagger decorators
4. Test with API tester
5. Update Postman collection
6. Document breaking changes

### 3. Debugging Issues

1. Check health endpoints
2. Review application logs
3. Use Sentry for error tracking
4. Test with API tester
5. Verify database state
6. Check external service status

## Troubleshooting

### Common Issues

#### API Tester Not Loading

- Ensure static file serving is enabled
- Check browser console for errors
- Verify application is running on correct port

#### Authentication Failures

- Check JWT secret configuration
- Verify user credentials
- Check token expiration
- Review authentication logs

#### Health Check Failures

- Verify database connection
- Check memory usage
- Verify disk space
- Review service dependencies

#### Slow Performance

- Check database query performance
- Review memory usage
- Analyze request logs
- Monitor external service calls

### Getting Help

1. **Documentation**: Review API documentation at `/api/docs`
2. **Logs**: Check application logs in `logs/` directory
3. **Health**: Monitor system health at `/api/health`
4. **Sentry**: Review error tracking dashboard
5. **Support**: Contact development team with detailed error information

## Best Practices

### API Testing

- Use consistent test data
- Test error scenarios
- Verify response formats
- Check authentication requirements
- Test rate limiting

### Monitoring

- Set up alerts for critical errors
- Monitor response times
- Track business metrics
- Review logs regularly
- Test health endpoints

### Development

- Use TypeScript for type safety
- Write comprehensive tests
- Document API changes
- Follow REST conventions
- Implement proper error handling

## Security Considerations

### API Security

- Always use HTTPS in production
- Implement rate limiting
- Validate all inputs
- Use proper authentication
- Log security events

### Development Security

- Don't commit secrets to version control
- Use environment variables for configuration
- Regularly update dependencies
- Review security logs
- Implement proper access controls
