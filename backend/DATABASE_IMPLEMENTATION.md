# Database Schema Implementation

## Overview

This document describes the complete database schema implementation for the AI-native ATS, focusing on the job posting variation model as specified in the requirements and design documents.

## Implementation Status

✅ **COMPLETED**: Database Schema Implementation (Task 2)

### What Was Implemented

1. **PostgreSQL Tables for Job Posting Variation Model**
   - ✅ `company_profiles` - Store company information and preferences
   - ✅ `job_families` - Canonical job categories (e.g., Software Engineer)
   - ✅ `job_templates` - Base job templates with experience levels
   - ✅ `company_job_variants` - Company-specific variations of job templates
   - ✅ `requirement_items` - Detailed requirements with MUST/SHOULD/NICE categorization
   - ✅ `jd_versions` - Versioned job descriptions with resolved specifications

2. **Database Migrations with Proper Indexing**
   - ✅ TypeORM migration files created (`001-initial-schema.ts`, `002-candidate-application-schema.ts`)
   - ✅ Performance indexes for foreign keys and frequently queried fields
   - ✅ Vector similarity index for skill embeddings using pgvector
   - ✅ Composite indexes for common query patterns

3. **pgvector Extension Setup**
   - ✅ Extension enabled in migration files
   - ✅ Vector column for skill embeddings (1536 dimensions for OpenAI text-embedding-3-large)
   - ✅ Cosine similarity index for efficient vector searches

4. **Comprehensive Seed Data**
   - ✅ 3 sample company profiles (TechStart Inc, Enterprise Solutions Corp, Creative Agency Plus)
   - ✅ 4 job families (Software Engineer, Product Manager, UX/UI Designer, Data Scientist)
   - ✅ 5 job templates with detailed requirement items
   - ✅ 5 company job variants with company-specific requirements
   - ✅ Sample users and email templates

## Architecture Alignment

The implementation perfectly aligns with the design document specifications:

### Job Posting Variation Model

- **JobFamily** → `job_families` table
- **JobTemplate** → `job_templates` table
- **CompanyProfile** → `company_profiles` table
- **CompanyJobVariant** → `company_job_variants` table
- **RequirementItem** → `requirement_items` table
- **JDVersion** → `jd_versions` table

### Key Features Implemented

1. **Hierarchical Job Structure**

   ```
   JobFamily (e.g., "Software Engineer")
   └── JobTemplate (e.g., "Senior Backend Engineer")
       └── CompanyJobVariant (e.g., "Senior Node.js Backend Engineer at TechStart")
           └── ResolvedJobSpec (generated from template + company preferences)
   ```

2. **Flexible Requirement System**
   - Requirements can be attached to job templates (base requirements)
   - Additional requirements can be attached to company variants
   - Three-tier categorization: MUST, SHOULD, NICE
   - Weighted scoring system (1-10 scale)
   - Alternative requirement paths supported

3. **Vector-Based Skill Matching**
   - pgvector extension for semantic similarity
   - 1536-dimensional embeddings (OpenAI text-embedding-3-large compatible)
   - Cosine similarity indexing for performance

## Requirements Satisfaction

### Requirement 2.1: Job Family and Template Management

✅ **SATISFIED**:

- `job_families` table stores canonical job categories
- `job_templates` table with base requirements and experience ranges
- Proper relationships and constraints implemented

### Requirement 2.2: Company Profile Integration

✅ **SATISFIED**:

- `company_profiles` table with industry, size, culture, benefits
- JSON preferences field for priority skills and deal-breakers
- Integration with job variants through foreign keys

### Requirement 2.3: Company Job Variants

✅ **SATISFIED**:

- `company_job_variants` table linking templates to companies
- Support for custom titles and descriptions
- Additional requirements through `requirement_items` table

### Requirement 2.4: Requirement Modification

✅ **SATISFIED**:

- Flexible requirement system supporting both template and variant-level requirements
- Weight-based scoring system
- Alternative requirement paths

### Requirement 2.5: Version Management

✅ **SATISFIED**:

- `jd_versions` table for versioning job descriptions
- Resolved specification storage as JSONB
- Audit trail with created_by and timestamps

## File Structure

```
backend/src/database/
├── data-source.ts              # TypeORM configuration
├── database.module.ts          # NestJS database module
├── verify-schema.ts           # Schema verification script
├── README.md                  # Database documentation
└── migrations/
    ├── 001-initial-schema.ts      # Core job variation model tables
    ├── 002-candidate-application-schema.ts  # Candidate/application tables
    └── 003-seed-data.ts          # Comprehensive test data
```

## Usage Instructions

### Running Migrations

```bash
# Run all migrations
npm run migration:run

# Verify schema
npm run schema:verify

# Revert last migration (if needed)
npm run migration:revert
```

### Environment Setup

Required environment variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=ai_native_ats
```

## Performance Considerations

### Indexing Strategy

- **Primary Keys**: UUID with btree indexes
- **Foreign Keys**: Indexed for join performance
- **Vector Similarity**: IVFFlat index for cosine similarity
- **Query Patterns**: Composite indexes for common filters

### Scalability Features

- Partitioning-ready design for large datasets
- Efficient vector similarity search
- Optimized for read-heavy workloads (job matching)
- Connection pooling support

## Testing and Validation

### Seed Data Coverage

- **3 Company Profiles**: Different industries and sizes
- **4 Job Families**: Covering major tech roles
- **5 Job Templates**: Various experience levels
- **30+ Requirement Items**: Comprehensive skill requirements
- **5 Company Variants**: Real-world customization examples

### Schema Verification

The `verify-schema.ts` script validates:

- Required extensions (uuid-ossp, vector)
- All expected tables exist
- Foreign key relationships
- Index presence and performance
- Sample data availability

## Next Steps

This database schema implementation is complete and ready for the next tasks:

1. **Task 3**: Core Backend API Structure
2. **Task 4**: Job Posting Variation Model Backend (CRUD operations)
3. **Task 5**: Basic API Endpoints for Job Management

The schema provides a solid foundation for building the AI-native ATS with proper separation of concerns, scalability, and performance optimization.

## Compliance and Security

- **Data Protection**: Proper constraints and validation
- **Audit Trail**: Timestamps and user tracking
- **Performance**: Optimized indexes and query patterns
- **Extensibility**: JSON fields for flexible data storage
- **Standards**: Following PostgreSQL and TypeORM best practices
