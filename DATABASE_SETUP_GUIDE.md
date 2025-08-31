# Database Setup Guide - Supabase Connection

This guide will help you set up the database connection with your existing Supabase project for the AI-native ATS authentication system.

## Prerequisites

✅ You already have a Supabase project created  
✅ Supabase URL: `https://vexbpfmwjxuiaumfvfpf.supabase.co`  
✅ Service key configured in `.env`

## Step 1: Get Your Database Credentials

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/projects
2. **Select your project**: `vexbpfmwjxuiaumfvfpf`
3. **Navigate to**: Settings → Database
4. **Find the Connection String section**
5. **Copy your database password** (you'll need this)

## Step 2: Update Environment Variables

Update your `backend/.env` file with the correct database credentials:

```bash
# Database Configuration - Using Supabase
DATABASE_URL=postgresql://postgres.vexbpfmwjxuiaumfvfpf:[YOUR_DB_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DB_HOST=aws-0-us-east-1.pooler.supabase.com
DB_PORT=5432
DB_USERNAME=postgres.vexbpfmwjxuiaumfvfpf
DB_PASSWORD=[YOUR_DB_PASSWORD]
DB_NAME=postgres

# Your existing Supabase configuration
SUPABASE_URL=https://vexbpfmwjxuiaumfvfpf.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZleGJwZm13anh1aWF1bWZ2ZnBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk4NzI3NCwiZXhwIjoyMDcxNTYzMjc0fQ.o3nM3P7zNQzCBz8RIqwrli185fRLQ0A-0HOHzBE67zU
```

**Replace `[YOUR_DB_PASSWORD]` with your actual database password from Supabase.**

## Step 3: Test Database Connection

Run the connection test to verify everything is working:

```bash
cd backend
npm run db:test
```

Expected output:

```
🔍 Testing database connection...
📡 Connecting to database...
✅ Connected successfully!
🔍 Testing basic query...
✅ Query successful!
⏰ Current time: 2025-01-30T...
🐘 PostgreSQL version: PostgreSQL 15.x
```

## Step 4: Enable Required Extensions

In your Supabase dashboard:

1. **Go to**: SQL Editor
2. **Run these commands**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable vector extension (for AI embeddings)
CREATE EXTENSION IF NOT EXISTS "vector";
```

## Step 5: Set Up Database Schema

Run the database setup script:

```bash
cd backend
npm run db:setup
```

This will:

- ✅ Verify your connection
- ✅ Run database migrations
- ✅ Set up the schema for the authentication system
- ✅ Create required tables and indexes

## Step 6: Verify Schema Setup

Check that everything is properly configured:

```bash
npm run schema:verify
```

Expected output:

```
✅ Database connection established
✅ uuid-ossp extension: installed
✅ vector extension: installed

📋 Table Verification:
  ✅ organizations
  ✅ users
  ✅ company_profiles
  ✅ job_families
  ✅ candidates
  ✅ applications
  ... (other tables)

🎉 Schema verification completed!
```

## Step 7: Run Authentication Tests

Now you can run the authentication system tests:

```bash
# Run all tests
npm test

# Run specific auth tests
npm run test:e2e -- --testPathPattern="auth"

# Run the complete registration flow tests
npm run test:e2e -- --testPathPattern="complete-registration-flow"
```

## Troubleshooting

### ❌ Connection Failed - Password Authentication

**Error**: `password authentication failed for user "postgres.vexbpfmwjxuiaumfvfpf"`

**Solution**:

1. Go to Supabase Dashboard → Settings → Database
2. Copy the correct database password
3. Update `DB_PASSWORD` and `DATABASE_URL` in your `.env` file

### ❌ Connection Failed - Host Not Found

**Error**: `getaddrinfo ENOTFOUND aws-0-us-east-1.pooler.supabase.com`

**Solution**:

1. Check your internet connection
2. Verify the Supabase URL is correct
3. Make sure you're using the connection pooler URL

### ❌ Extensions Not Found

**Error**: `vector extension: ❌ missing`

**Solution**:

1. Go to Supabase Dashboard → SQL Editor
2. Run: `CREATE EXTENSION IF NOT EXISTS "vector";`
3. Run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### ❌ Migration Errors

**Error**: Migration fails with table already exists

**Solution**:

```bash
# Reset and re-run migrations
npm run schema:drop
npm run migration:run
```

## Database Schema Overview

The authentication system uses these key tables:

### Organizations (Multi-tenant)

- `id` - UUID primary key
- `name` - Organization name
- `type` - startup, smb, agency, enterprise
- `subscription_plan` - free, basic, professional, enterprise

### Users (Multi-tenant)

- `id` - UUID primary key
- `email` - User email (unique per organization)
- `password_hash` - Encrypted password
- `organization_id` - Foreign key to organizations
- `role` - admin, recruiter, hiring_manager

### Key Features

- ✅ **Multi-tenant architecture** - Same email can exist in different organizations
- ✅ **Composite unique constraints** - Prevents duplicates within same organization
- ✅ **Proper relationships** - Foreign keys ensure data integrity
- ✅ **Performance indexes** - Optimized for authentication queries

## Next Steps

Once your database is set up:

1. **Start the backend server**:

   ```bash
   npm run start:dev
   ```

2. **Test the authentication endpoints**:
   - POST `/auth/register` - User registration
   - POST `/auth/login` - User login
   - POST `/auth/refresh` - Token refresh
   - GET `/auth/verify` - Token verification

3. **Run the complete test suite**:
   ```bash
   npm test
   ```

Your database is now ready to support the authentication system with multi-tenant architecture! 🎉
