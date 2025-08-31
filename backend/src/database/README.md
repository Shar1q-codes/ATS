# Database Setup

This directory contains the database configuration, migrations, and related files for the AI-native ATS.

## Structure

- `data-source.ts` - TypeORM data source configuration
- `database.module.ts` - NestJS database module
- `migrations/` - Database migration files
- `README.md` - This file

## Prerequisites

1. PostgreSQL database with pgvector extension support
2. Environment variables configured (see `.env.example`)

## Required Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=ai_native_ats
NODE_ENV=development
```

## Migration Commands

### Run all pending migrations

```bash
npm run migration:run
```

### Revert the last migration

```bash
npm run migration:revert
```

### Generate a new migration (after entity changes)

```bash
npm run migration:generate -- src/database/migrations/YourMigrationName
```

### Drop entire schema (DANGER - only for development)

```bash
npm run schema:drop
```

## Migration Files

1. **001-initial-schema.ts** - Creates the core job posting variation model tables:
   - company_profiles
   - job_families
   - job_templates
   - company_job_variants
   - requirement_items
   - users
   - jd_versions

2. **002-candidate-application-schema.ts** - Creates candidate and application management tables:
   - candidates (with pgvector support for skill embeddings)
   - parsed_resume_data
   - applications
   - match_explanations
   - application_notes
   - stage_history
   - email_templates
   - email_logs

3. **003-seed-data.ts** - Inserts comprehensive test data:
   - Sample company profiles (TechStart Inc, Enterprise Solutions Corp, Creative Agency Plus)
   - Job families (Software Engineer, Product Manager, UX/UI Designer, Data Scientist)
   - Job templates with detailed requirement items
   - Company job variants with company-specific requirements
   - Sample users and email templates

## Database Features

### pgvector Extension

The database uses the pgvector extension for storing and querying skill embeddings:

- Skill embeddings are stored as 1536-dimensional vectors (OpenAI text-embedding-3-large)
- Cosine similarity index for efficient similarity searches
- Used for AI-powered candidate matching

### Indexing Strategy

Performance indexes are created for:

- Foreign key relationships
- Frequently queried fields (email, status, etc.)
- Vector similarity searches
- Composite indexes for common query patterns

### Triggers

Automatic `updated_at` timestamp triggers are set up for relevant tables to track record modifications.

## Development Workflow

1. **Initial Setup**:

   ```bash
   # Run all migrations to set up the schema
   npm run migration:run
   ```

2. **Making Schema Changes**:

   ```bash
   # After modifying entities, generate a new migration
   npm run migration:generate -- src/database/migrations/YourChangeName

   # Review the generated migration file
   # Run the migration
   npm run migration:run
   ```

3. **Testing**:
   - Use the seed data for testing (migration 003)
   - Consider creating additional test-specific migrations for complex scenarios

## Production Considerations

- Always use migrations in production (never set `synchronize: true`)
- Backup database before running migrations
- Test migrations on staging environment first
- Monitor migration performance for large datasets
- Consider downtime requirements for schema changes

## Troubleshooting

### pgvector Extension Issues

If you encounter pgvector-related errors:

1. Ensure PostgreSQL has the pgvector extension installed
2. For Supabase: The extension should be available by default
3. For local development: Install pgvector extension manually

### Migration Conflicts

If migrations fail due to conflicts:

1. Check the current migration state: Look at the `migrations` table
2. Manually resolve conflicts if necessary
3. Consider creating a new migration to fix issues rather than modifying existing ones
