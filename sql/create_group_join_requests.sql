-- ============================================
-- P4-A: Group Join Requests
-- ============================================

-- 1. Add is_private flag to groups
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;

-- 2. Create group_join_requests table
CREATE TABLE IF NOT EXISTS group_join_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    requester_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    host_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    decided_at      TIMESTAMPTZ,
    UNIQUE (group_id, requester_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_requester ON group_join_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_host ON group_join_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_pending ON group_join_requests(group_id, status) WHERE status = 'Pending';

-- 4. Enable RLS
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Requesters and hosts can view group join requests"
    ON group_join_requests FOR SELECT
    TO authenticated
    USING (requester_id = auth.uid() OR host_id = auth.uid());

CREATE POLICY "Authenticated users can insert group join requests"
    ON group_join_requests FOR INSERT
    TO authenticated
    WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Hosts can update group join requests"
    ON group_join_requests FOR UPDATE
    TO authenticated
    USING (host_id = auth.uid());

CREATE POLICY "Requesters can delete their own pending requests"
    ON group_join_requests FOR DELETE
    TO authenticated
    USING (requester_id = auth.uid() AND status = 'Pending');
