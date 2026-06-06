-- ============================================
-- P3-A: Notifications System
-- ============================================

-- Drop existing table if re-running
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type            TEXT NOT NULL CHECK (type IN (
        'friend_request',
        'friend_accepted',
        'session_join_request',
        'session_join_accepted',
        'session_join_rejected',
        'task_assigned'
    )),
    reference_id    UUID,                -- links to the related entity (friendship, session, task)
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON notifications(recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(recipient_id, created_at DESC)
    WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON notifications(type, recipient_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid());

CREATE POLICY "Authenticated users can insert notifications"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Optional: auto-cleanup old read notifications after 90 days
-- Uncomment if desired:
-- SELECT cron.schedule('cleanup-old-notifications', '0 0 * * *',
--     $$ DELETE FROM notifications WHERE is_read = TRUE AND created_at < now() - interval '90 days' $$);
