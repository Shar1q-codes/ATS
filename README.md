# AI-Native ATS

An AI-powered Applicant Tracking System designed for SMBs, startups, and recruitment agencies.

## Features

- AI-powered resume parsing with GPT-4o
- Explainable candidate matching with fit scores
- Job posting variation model for efficient role management
- Pipeline management with Kanban interface
- GDPR/CCPA compliant data handling
- Mobile-responsive candidate experience

## Architecture

- **Frontend**: Next.js 14 with TypeScript, TailwindCSS, ShadCN/UI
- **Backend**: NestJS with TypeScript, PostgreSQL via Supabase
- **AI**: OpenAI GPT-4o for parsing, text-embedding-3-large for matching
- **Storage**: Supabase for database and file storage

## Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables (see Environment Configuration below)

4. Start development servers:
   ```bash
   npm run dev
   ```

This will start both frontend (http://localhost:3000) and backend (http://localhost:3001) servers.

### Environment Configuration

#### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Backend (.env)

```
# Database
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Email (optional for development)
POSTMARK_API_KEY=your_postmark_api_key
SENDGRID_API_KEY=your_sendgrid_api_key

# Environment
NODE_ENV=development
PORT=3001
```

## Project Structure

```
├── frontend/          # Next.js frontend application
├── backend/           # NestJS backend API
├── database/          # Database migrations and seeds
├── docs/              # Documentation
└── .github/           # GitHub Actions workflows
```

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications for production
- `npm run test` - Run tests for both applications
- `npm run lint` - Lint both applications

## Deployment

The application is configured for deployment on:

- **Frontend**: Vercel
- **Backend**: Railway or similar Node.js hosting
- **Database**: Supabase (managed PostgreSQL)

See deployment documentation in `/docs` for detailed instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

Private - All rights reserved
