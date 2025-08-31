-- Add saved searches table
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    search_type VARCHAR(50) NOT NULL CHECK (search_type IN ('candidates', 'jobs', 'applications', 'all')),
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with UUID[] DEFAULT ARRAY[]::UUID[],
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_saved_searches_tenant_id ON saved_searches(tenant_id);
CREATE INDEX idx_saved_searches_created_by ON saved_searches(created_by);
CREATE INDEX idx_saved_searches_search_type ON saved_searches(search_type);
CREATE INDEX idx_saved_searches_is_shared ON saved_searches(is_shared);
CREATE INDEX idx_saved_searches_usage_count ON saved_searches(usage_count DESC);
CREATE INDEX idx_saved_searches_last_used_at ON saved_searches(last_used_at DESC);

-- Add GIN index for filters JSONB column
CREATE INDEX idx_saved_searches_filters ON saved_searches USING GIN (filters);

-- Add GIN index for shared_with array
CREATE INDEX idx_saved_searches_shared_with ON saved_searches USING GIN (shared_with);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_searches_updated_at
    BEFORE UPDATE ON saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_searches_updated_at();