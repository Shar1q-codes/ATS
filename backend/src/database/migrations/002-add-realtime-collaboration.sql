-- Add real-time collaboration features

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('application_stage_change', 'mention', 'application_note', 'system')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    application_note_id UUID REFERENCES application_notes(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_tenant ON notifications(recipient_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type_tenant ON notifications(type, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Update application_notes table for real-time collaboration
ALTER TABLE application_notes 
ADD COLUMN IF NOT EXISTS tenant_id UUID,
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for application_notes
CREATE INDEX IF NOT EXISTS idx_application_notes_application_tenant ON application_notes(application_id, tenant_id);

-- Update existing application_notes records to use new fields
UPDATE application_notes 
SET 
    author_id = user_id,
    content = note,
    updated_at = created_at
WHERE author_id IS NULL AND user_id IS NOT NULL;

-- Update tenant_id for existing application_notes (this would need to be done based on the application's tenant)
-- This is a placeholder - in a real migration, you'd need to join with applications table
-- UPDATE application_notes SET tenant_id = (SELECT tenant_id FROM applications WHERE applications.id = application_notes.application_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_application_notes_updated_at 
    BEFORE UPDATE ON application_notes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();