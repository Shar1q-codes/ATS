# Deployment Guide

This document provides instructions for deploying the AI-Native ATS to various environments.

## Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Redis instance
- OpenAI API key
- Email service API key (Postmark or SendGrid)

## Environment Setup

### Development

1. Copy environment files:

   ```bash
   cp .env.example .env
   cp frontend/.env.example frontend/.env.local
   cp backend/.env.example backend/.env
   ```

2. Update environment variables with your actual values

3. Start services:

   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d

   # Or manually
   npm install
   npm run dev
   ```

### Staging

The staging environment is automatically deployed when code is pushed to the `develop` branch.

**Required GitHub Secrets:**

- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `RAILWAY_TOKEN` - Railway deployment token
- `RAILWAY_PROJECT_ID` - Railway project ID

### Production

Production deployment is triggered when code is pushed to the `main` branch.

**Additional Production Secrets:**

- `PRODUCTION_DATABASE_URL` - Production database connection string

## Platform-Specific Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Deploy:
   ```bash
   vercel --prod
   ```

### Backend (Railway)

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `OPENAI_API_KEY`
   - `REDIS_URL`
   - `NODE_ENV=production`

3. Deploy:
   ```bash
   railway up
   ```

### Database (Supabase)

1. Create a new Supabase project
2. Run the schema migration:
   ```sql
   -- Copy contents of database/schema.sql
   ```
3. Optionally run seed data:
   ```sql
   -- Copy contents of database/seed.sql
   ```

## Health Checks

### Frontend

- URL: `https://your-domain.com`
- Expected: Next.js application loads

### Backend

- URL: `https://your-api-domain.com/api/health`
- Expected: JSON response with status "ok"

### Database

- Connection test via backend health endpoint
- Expected: Database queries execute successfully

## Monitoring

### Application Monitoring

- Use Vercel Analytics for frontend performance
- Use Railway metrics for backend performance
- Set up Sentry for error tracking

### Database Monitoring

- Use Supabase dashboard for database metrics
- Monitor query performance and connection counts

### Alerts

- Set up alerts for:
  - Application errors
  - High response times
  - Database connection issues
  - API rate limit exceeded

## Backup and Recovery

### Database Backup

- Supabase provides automatic backups
- Manual backup: Use `pg_dump` for additional backups

### File Storage Backup

- Supabase Storage provides redundancy
- Consider additional backup for critical files

## Security Considerations

### Environment Variables

- Never commit `.env` files
- Use secure secret management in production
- Rotate secrets regularly

### Database Security

- Use connection pooling
- Enable SSL connections
- Regular security updates

### API Security

- Rate limiting enabled
- CORS properly configured
- Input validation on all endpoints

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all environment variables are set
   - Review build logs for specific errors

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check network connectivity
   - Ensure database is running

3. **API Errors**
   - Check backend logs
   - Verify environment variables
   - Test database connectivity

### Debug Commands

```bash
# Check application health
curl https://your-api-domain.com/api/health

# View backend logs
railway logs

# View frontend logs
vercel logs

# Test database connection
psql $DATABASE_URL -c "SELECT 1;"
```

## Performance Optimization

### Frontend

- Enable Next.js static generation where possible
- Optimize images and assets
- Use CDN for static content

### Backend

- Implement caching strategies
- Optimize database queries
- Use connection pooling

### Database

- Create appropriate indexes
- Monitor slow queries
- Regular maintenance tasks

## Scaling

### Horizontal Scaling

- Frontend: Vercel handles automatically
- Backend: Railway supports horizontal scaling
- Database: Supabase provides read replicas

### Vertical Scaling

- Monitor resource usage
- Upgrade plans as needed
- Optimize before scaling
