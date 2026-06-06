-- ============================================
-- Drop Notifications System Completely
-- ============================================

-- Remove function first (depends on table)
DROP FUNCTION IF EXISTS create_notification_rpc(UUID, UUID, TEXT, UUID, TEXT);

-- Remove from realtime publication
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
    END IF;
END
$$;

-- Drop table (cascades policies and indexes automatically)
DROP TABLE IF EXISTS notifications CASCADE;
