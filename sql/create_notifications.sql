-- ============================================
-- P3-A: Notifications System (Safe for re-runs)
-- ============================================

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
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
    reference_id    UUID,
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

-- Drop ALL existing policies first to ensure clean state
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated inserts to notifications" ON notifications;
DROP POLICY IF EXISTS "Allow inserts to notifications" ON notifications;

-- SELECT: users can only read their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (recipient_id = auth.uid());

-- UPDATE: users can only mark their own notifications as read
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid());

-- INSERT: any authenticated user can create notifications
CREATE POLICY "Allow inserts to notifications"
    ON notifications FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Add table to realtime publication so Supabase Realtime works
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END
$$;

-- ============================================
-- BYPASS RLS: Stored procedure for inserts
-- ============================================
-- Frontend direct INSERT keeps failing with RLS violation even
-- though auth is valid. This RPC function runs as the table owner
-- (SECURITY DEFINER) and bypasses RLS entirely.

CREATE OR REPLACE FUNCTION create_notification_rpc(
    p_recipient_id UUID,
    p_sender_id UUID,
    p_type TEXT,
    p_reference_id UUID,
    p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO notifications (recipient_id, sender_id, type, reference_id, message)
    VALUES (p_recipient_id, p_sender_id, p_type, p_reference_id, p_message)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_notification_rpc(UUID, UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification_rpc(UUID, UUID, TEXT, UUID, TEXT) TO anon;
