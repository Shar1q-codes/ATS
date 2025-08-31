-- Migration: Add Multi-Tenant Support
-- This migration adds the organizations table and tenant_id columns to all relevant tables

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
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

-- Add organization_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add organization_id to company_profiles table
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add organization_id to job_families table
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add organization_id to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add organization_id to email_templates table
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Create a default organization for existing data
INSERT INTO organizations (id, name, type, subscription_plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'smb', 'free')
ON CONFLICT (id) DO NOTHING;

-- Update existing records to use the default organization
UPDATE users SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE company_profiles SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE job_families SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE candidates SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE email_templates SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE company_profiles ADD CONSTRAINT fk_company_profiles_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE job_families ADD CONSTRAINT fk_job_families_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE candidates ADD CONSTRAINT fk_candidates_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE email_templates ADD CONSTRAINT fk_email_templates_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Make organization_id NOT NULL after setting default values
ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE company_profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE job_families ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE candidates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE email_templates ALTER COLUMN organization_id SET NOT NULL;

-- Update unique constraints to include organization_id
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD CONSTRAINT users_email_organization_unique UNIQUE (email, organization_id);

ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_email_key;
ALTER TABLE candidates ADD CONSTRAINT candidates_email_organization_unique UNIQUE (email, organization_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email_organization ON users(email, organization_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_organization_id ON company_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_families_organization_id ON job_families(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_organization_id ON candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email_organization ON candidates(email, organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);

-- Add updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();