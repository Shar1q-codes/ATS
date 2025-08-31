# Free Alpha Deployment Guide

## Quick Start (5 minutes to live!)

### Prerequisites

- GitHub account
- Vercel account (free)
- Railway account (free)
- Supabase account (free)
- Upstash account (free)

### 1. Frontend Deployment (Vercel)

1. **Connect GitHub to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Import your repository
   - Select `frontend` as root directory

2. **Environment Variables:**

   ```
   NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Deploy:**
   - Click "Deploy"
   - Your frontend will be live at `https://your-app.vercel.app`

### 2. Backend Deployment (Railway)

1. **Connect GitHub to Railway:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Create new project from GitHub repo
   - Select `backend` as root directory

2. **Environment Variables:**

   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   REDIS_URL=redis://:[password]@[endpoint].upstash.io:6379
   JWT_SECRET=your-super-secret-jwt-key-here
   OPENAI_API_KEY=your-openai-api-key
   PORT=3001
   CORS_ORIGIN=https://your-app.vercel.app
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_KEY=your-supabase-service-key
   ```

3. **Deploy:**
   - Railway will auto-deploy
   - Your API will be live at `https://your-app.up.railway.app`

### 3. Database Setup (Supabase - Already Done!)

Your Supabase is already configured. Just ensure you're on the free tier:

- ✅ 500MB database storage
- ✅ 50MB file storage
- ✅ 2GB bandwidth/month
- ✅ Up to 50,000 monthly active users

### 4. Redis Setup (Upstash)

1. **Create Redis Database:**
   - Go to [upstash.com](https://upstash.com)
   - Sign up for free
   - Create Redis database
   - Copy connection URL

2. **Free Tier Limits:**
   - 10,000 requests/day
   - 256MB storage
   - Perfect for alpha testing!

### 5. Monitoring Setup (Sentry)

1. **Create Sentry Project:**
   - Go to [sentry.io](https://sentry.io)
   - Sign up for free
   - Create new project (React + Node.js)
   - Get DSN URLs

2. **Add to Environment Variables:**

   ```
   # Frontend (Vercel)
   NEXT_PUBLIC_SENTRY_DSN=your-frontend-sentry-dsn

   # Backend (Railway)
   SENTRY_DSN=your-backend-sentry-dsn
   ```

## Free Tier Limitations

### Vercel (Frontend)

- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ⚠️ 10 second function timeout
- ⚠️ 12 serverless functions per deployment

### Railway (Backend)

- ✅ $5 credit monthly (usually enough)
- ✅ 512MB RAM, 1 vCPU
- ⚠️ Apps sleep after 1 hour of inactivity
- ⚠️ 500 hours/month execution time

### Supabase (Database)

- ✅ 500MB database
- ✅ 50MB file storage
- ✅ 2GB bandwidth/month
- ⚠️ 2 projects max
- ⚠️ 7 days of log retention

### Upstash (Redis)

- ✅ 10,000 requests/day
- ✅ 256MB storage
- ⚠️ Single region only

## Alpha Testing Considerations

### Expected Usage for Alpha:

- **Users:** 10-50 alpha testers
- **Requests:** ~1,000-5,000/day
- **Data:** <100MB
- **Files:** <10MB

### All free tiers should handle this easily!

## Upgrade Path

When you outgrow free tiers:

1. **Vercel Pro:** $20/month (more bandwidth, faster builds)
2. **Railway Pro:** $5-20/month (no sleep, more resources)
3. **Supabase Pro:** $25/month (8GB database, more bandwidth)
4. **Upstash Pro:** $10/month (more requests, multiple regions)

## Quick Commands

### Deploy Frontend:

```bash
cd frontend
npx vercel --prod
```

### Deploy Backend:

```bash
cd backend
npx @railway/cli up
```

### Check Status:

```bash
# Frontend
curl https://your-app.vercel.app/api/health

# Backend
curl https://your-app.up.railway.app/api/health
```

## Troubleshooting

### Common Issues:

1. **Backend sleeping on Railway:**
   - Use a free uptime monitor (UptimeRobot)
   - Ping your API every 14 minutes

2. **CORS errors:**
   - Ensure CORS_ORIGIN matches your Vercel URL exactly
   - Include both with and without trailing slash

3. **Database connection issues:**
   - Check Supabase connection string format
   - Ensure IP restrictions are disabled for alpha

4. **Environment variables not working:**
   - Redeploy after adding env vars
   - Check for typos in variable names

## Success Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway
- [ ] Database connected (Supabase)
- [ ] Redis connected (Upstash)
- [ ] Environment variables configured
- [ ] CORS configured correctly
- [ ] Health endpoints responding
- [ ] Monitoring setup (Sentry)
- [ ] Custom domain configured (optional)

Your AI-Native ATS should now be live and ready for alpha testing at **$0/month**!
