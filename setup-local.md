# 🚀 Local Setup Guide for AI-Native ATS

## Quick Setup Steps

### 1. **Get OpenAI API Key** (Required)

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 2. **Set up Supabase Database** (Easiest option)

1. Go to https://supabase.com
2. Sign up/Login
3. Create a new project
4. Go to Settings > Database
5. Copy your connection string
6. Go to SQL Editor and run the schema from `database/schema.sql`

### 3. **Update Environment Files**

**Update `.env`:**

```bash
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

**Update `backend/.env`:**

```bash
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

**Update `frontend/.env.local`:**

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. **Start the Application**

Open 2 terminals:

**Terminal 1 - Backend:**

```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### 5. **Access the Application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api

## What You'll See

1. **Login/Register Page** - Create your first user account
2. **Dashboard** - Overview of your ATS
3. **Candidates** - Upload and manage resumes (AI parsing)
4. **Jobs** - Create job families, templates, and variants
5. **Applications** - Kanban board for pipeline management
6. **Analytics** - Recruitment metrics and insights

## Test the AI Features

1. **Upload a Resume**: Go to Candidates > Upload Resume
2. **Create a Job**: Go to Jobs > Create Job Family/Template
3. **See AI Matching**: Apply candidates to jobs and see fit scores
4. **Pipeline Management**: Drag candidates through stages

## Troubleshooting

- **Database Connection**: Make sure Supabase credentials are correct
- **OpenAI API**: Ensure your API key is valid and has credits
- **Port Conflicts**: Make sure ports 3000 and 3001 are free
- **CORS Issues**: Backend CORS is set to allow localhost:3000

## Next Steps

Once everything is working:

1. Create sample data (companies, job templates)
2. Upload test resumes
3. Explore the AI matching features
4. Try the pipeline management
5. Check out the analytics dashboard
