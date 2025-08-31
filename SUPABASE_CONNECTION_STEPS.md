# Supabase Database Connection - Step by Step

## 🎯 Quick Setup Guide

Your Supabase project: **vexbpfmwjxuiaumfvfpf**

### Step 1: Get Your Database Password

1. **Open Supabase Dashboard**: https://supabase.com/dashboard/projects
2. **Select your project**: `vexbpfmwjxuiaumfvfpf`
3. **Go to**: Settings → Database
4. **Find**: "Connection string" section
5. **Copy the password** (it will look like a long random string)

### Step 2: Update Your .env File

Replace `[YOUR_DB_PASSWORD]` in `backend/.env` with your actual password:

```bash
# Database Configuration - Using Supabase
DATABASE_URL=postgresql://postgres:[YOUR_ACTUAL_PASSWORD]@db.vexbpfmwjxuiaumfvfpf.supabase.co:5432/postgres
DB_HOST=db.vexbpfmwjxuiaumfvfpf.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=[YOUR_ACTUAL_PASSWORD]
DB_NAME=postgres
```

### Step 3: Test Connection

```bash
cd backend
npm run db:test
```

**Expected Success Output**:

```
🔍 Testing database connection...
📡 Connecting to database...
✅ Connected successfully!
🔍 Testing basic query...
✅ Query successful!
```

### Step 4: Enable Extensions (One-time setup)

In Supabase Dashboard → SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Step 5: Set Up Schema

```bash
npm run db:setup
```

### Step 6: Verify Everything Works

```bash
npm run schema:verify
```

## 🔧 Troubleshooting

### ❌ "Tenant or user not found"

- **Cause**: Wrong connection string format
- **Fix**: Make sure you're using the direct connection URL format

### ❌ "Password authentication failed"

- **Cause**: Wrong password
- **Fix**: Get the correct password from Supabase Dashboard → Settings → Database

### ❌ "Connection timeout"

- **Cause**: Network or firewall issues
- **Fix**: Check internet connection, try different network

## 🚀 Once Connected

After successful connection, you can:

1. **Start the backend**:

   ```bash
   npm run start:dev
   ```

2. **Run authentication tests**:

   ```bash
   npm test -- --testPathPattern="auth"
   ```

3. **Test complete registration flow**:
   ```bash
   npm run test:e2e -- --testPathPattern="complete-registration-flow"
   ```

## 📞 Need Help?

Run this command to see your project details:

```bash
npm run db:credentials
```

Your database will be ready for the authentication system once connected! 🎉
