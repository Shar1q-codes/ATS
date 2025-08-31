-- AI-Native ATS Database Schema
-- PostgreSQL with Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Organizations (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    type VARCHAR(50) DEFAULT 'smb' CHECK (type IN ('startup', 'smb', 'agency', 'enterprise')),
    subscription_plan VARCHAR(50) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'professional', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    logo_url VARCHAR(500),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'hiring_manager')),
    company_id UUID,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, organization_id)
);

-- Company Profiles
CREATE TABLE company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    size VARCHAR(50) CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    culture TEXT[],
    benefits TEXT[],
    work_arrangement VARCHAR(50) CHECK (work_arrangement IN ('remote', 'hybrid', 'onsite')),
    location VARCHAR(255),
    preferences JSONB,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Families
CREATE TABLE job_families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    skill_categories TEXT[],
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Templates
CREATE TABLE job_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_family_id UUID NOT NULL REFERENCES job_families(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) CHECK (level IN ('junior', 'mid', 'senior', 'lead', 'principal')),
    experience_range_min INTEGER,
    experience_range_max INTEGER,
    salary_range_min INTEGER,
    salary_range_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Requirement Items
CREATE TABLE requirement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) CHECK (type IN ('skill', 'experience', 'education', 'certification', 'other')),
    category VARCHAR(50) CHECK (category IN ('must', 'should', 'nice')),
    description TEXT NOT NULL,
    weight INTEGER DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
    alternatives TEXT[],
    job_template_id UUID REFERENCES job_templates(id) ON DELETE CASCADE,
    company_job_variant_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company Job Variants
CREATE TABLE company_job_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_template_id UUID NOT NULL REFERENCES job_templates(id) ON DELETE CASCADE,
    company_profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
    custom_title VARCHAR(255),
    custom_description TEXT,
    is_active BOOLEAN DEFAULT true,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Description Versions
CREATE TABLE jd_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_job_variant_id UUID NOT NULL REFERENCES company_job_variants(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    resolved_spec JSONB NOT NULL,
    published_content TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidates
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(255),
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    resume_url VARCHAR(500),
    skill_embeddings vector(1536), -- OpenAI text-embedding-3-large dimension
    total_experience INTEGER DEFAULT 0,
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, organization_id)
);

-- Parsed Resume Data
CREATE TABLE parsed_resume_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    skills JSONB,
    experience JSONB,
    education JSONB,
    certifications JSONB,
    summary TEXT,
    raw_text TEXT,
    parsing_confidence DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    company_job_variant_id UUID NOT NULL REFERENCES company_job_variants(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'applied' CHECK (status IN (
        'applied', 'screening', 'shortlisted', 'interview_scheduled', 
        'interview_completed', 'offer_extended', 'offer_accepted', 'hired', 'rejected'
    )),
    fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(candidate_id, company_job_variant_id)
);

-- Match Explanations
CREATE TABLE match_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    must_have_score INTEGER NOT NULL,
    should_have_score INTEGER NOT NULL,
    nice_to_have_score INTEGER NOT NULL,
    strengths TEXT[],
    gaps TEXT[],
    recommendations TEXT[],
    detailed_analysis JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application Notes
CREATE TABLE application_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    note TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stage History
CREATE TABLE stage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    automated BOOLEAN DEFAULT false
);

-- Email Templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    template_type VARCHAR(100) NOT NULL,
    company_id UUID REFERENCES company_profiles(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Logs
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id),
    candidate_id UUID NOT NULL REFERENCES candidates(id),
    template_id UUID REFERENCES email_templates(id),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status VARCHAR(50) DEFAULT 'sent',
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key constraint for requirement_items company_job_variant_id
ALTER TABLE requirement_items 
ADD CONSTRAINT fk_requirement_items_company_job_variant 
FOREIGN KEY (company_job_variant_id) REFERENCES company_job_variants(id) ON DELETE CASCADE;

-- Add foreign key constraint for users company_id
ALTER TABLE users 
ADD CONSTRAINT fk_users_company 
FOREIGN KEY (company_id) REFERENCES company_profiles(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_organizations_domain ON organizations(domain);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email_organization ON users(email, organization_id);
CREATE INDEX idx_company_profiles_organization_id ON company_profiles(organization_id);
CREATE INDEX idx_job_families_organization_id ON job_families(organization_id);
CREATE INDEX idx_candidates_organization_id ON candidates(organization_id);
CREATE INDEX idx_candidates_email_organization ON candidates(email, organization_id);
CREATE INDEX idx_candidates_skill_embeddings ON candidates USING ivfflat (skill_embeddings vector_cosine_ops);
CREATE INDEX idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX idx_applications_job_variant_id ON applications(company_job_variant_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_stage_history_application_id ON stage_history(application_id);
CREATE INDEX idx_requirement_items_job_template_id ON requirement_items(job_template_id);
CREATE INDEX idx_requirement_items_company_job_variant_id ON requirement_items(company_job_variant_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_families_updated_at BEFORE UPDATE ON job_families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_templates_updated_at BEFORE UPDATE ON job_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_job_variants_updated_at BEFORE UPDATE ON company_job_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_last_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();