-- Add read receipt tracking to messages table
-- Used for DM read status (single check = sent, double check = read)

alter table public.messages
    add column if not exists is_read boolean default false;

-- Index for fast unread message queries
CREATE INDEX IF NOT EXISTS idx_messages_unread
    ON public.messages(receiver_id, is_read)
    WHERE is_read = false;

-- Index for marking messages as read by sender
CREATE INDEX IF NOT EXISTS idx_messages_read_by_sender
    ON public.messages(sender_id, receiver_id, is_read)
    WHERE is_read = false;
