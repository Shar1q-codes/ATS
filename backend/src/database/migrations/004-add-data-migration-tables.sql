-- Migration: Add data import/export and migration tables
-- Created: 2024-01-01

-- Create import_jobs table
CREATE TABLE import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('candidates', 'jobs', 'applications', 'companies')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    field_mapping JSONB,
    errors JSONB,
    preview JSONB,
    created_by UUID NOT NULL,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_import_jobs_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create export_jobs table
CREATE TABLE export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('candidates', 'jobs', 'applications', 'companies', 'full_backup')),
    format VARCHAR(50) NOT NULL CHECK (format IN ('csv', 'excel', 'json', 'xml')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    filters JSONB,
    selected_fields TEXT[],
    file_url TEXT,
    file_size BIGINT,
    record_count INTEGER,
    error_message TEXT,
    created_by UUID NOT NULL,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_export_jobs_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create field_mappings table
CREATE TABLE field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('candidates', 'jobs', 'applications', 'companies')),
    mapping JSONB NOT NULL,
    transformations JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL,
    organization_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_field_mappings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT unique_default_mapping_per_type UNIQUE (organization_id, type, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for better performance
CREATE INDEX idx_import_jobs_organization_id ON import_jobs(organization_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_jobs_type ON import_jobs(type);
CREATE INDEX idx_import_jobs_created_at ON import_jobs(created_at);

CREATE INDEX idx_export_jobs_organization_id ON export_jobs(organization_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_type ON export_jobs(type);
CREATE INDEX idx_export_jobs_created_at ON export_jobs(created_at);
CREATE INDEX idx_export_jobs_expires_at ON export_jobs(expires_at);

CREATE INDEX idx_field_mappings_organization_id ON field_mappings(organization_id);
CREATE INDEX idx_field_mappings_type ON field_mappings(type);
CREATE INDEX idx_field_mappings_is_default ON field_mappings(is_default);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_import_jobs_updated_at BEFORE UPDATE ON import_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_jobs_updated_at BEFORE UPDATE ON export_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_field_mappings_updated_at BEFORE UPDATE ON field_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default field mappings for each organization
-- This will be done programmatically when organizations are created

-- Add comments for documentation
COMMENT ON TABLE import_jobs IS 'Tracks data import jobs and their progress';
COMMENT ON TABLE export_jobs IS 'Tracks data export jobs and their progress';
COMMENT ON TABLE field_mappings IS 'Stores field mapping configurations for data import/export';

COMMENT ON COLUMN import_jobs.field_mapping IS 'JSON mapping of source fields to target fields';
COMMENT ON COLUMN import_jobs.errors IS 'Array of validation errors encountered during import';
COMMENT ON COLUMN import_jobs.preview IS 'Preview of first few records for validation';

COMMENT ON COLUMN export_jobs.filters IS 'JSON filters applied to the export query';
COMMENT ON COLUMN export_jobs.selected_fields IS 'Array of fields to include in export';
COMMENT ON COLUMN export_jobs.expires_at IS 'When the exported file will be automatically deleted';

COMMENT ON COLUMN field_mappings.mapping IS 'JSON mapping of source fields to target entity fields';
COMMENT ON COLUMN field_mappings.transformations IS 'JSON configuration for field transformations';
COMMENT ON COLUMN field_mappings.is_default IS 'Whether this is the default mapping for the type';