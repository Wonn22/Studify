-- ============================================
-- P4-B: Group Ownership & Admin
-- ============================================

-- 1. Add created_by to groups table
ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Migrate existing groups: set created_by from first participant
UPDATE groups g
SET created_by = (
    SELECT profile_id
    FROM group_participants gp
    WHERE gp.group_id = g.id
    ORDER BY gp.joined_at ASC
    LIMIT 1
)
WHERE created_by IS NULL;

-- 3. Ensure role column has proper default
ALTER TABLE group_participants
    ALTER COLUMN role SET DEFAULT 'Member';

-- 4. Index for created_by lookups
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

-- 5. Update RLS policies for groups
-- Only creator (or admin) can update their group
DROP POLICY IF EXISTS "Users can update own groups" ON groups;
CREATE POLICY "Group creators can update their groups"
    ON groups FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid());

-- Only creator can delete their group
DROP POLICY IF EXISTS "Users can delete own groups" ON groups;
CREATE POLICY "Group creators can delete their groups"
    ON groups FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- 6. Update group_participants RLS
-- Current members can view participants
DROP POLICY IF EXISTS "Users can view group participants" ON group_participants;
CREATE POLICY "Users can view group participants"
    ON group_participants FOR SELECT
    TO authenticated
    USING (true);

-- Users can join public groups (handled by app logic + group_join_requests for private)
-- Admins can remove members
DROP POLICY IF EXISTS "Admins can remove group participants" ON group_participants;
CREATE POLICY "Admins can remove group participants"
    ON group_participants FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_participants gp
            WHERE gp.group_id = group_participants.group_id
            AND gp.profile_id = auth.uid()
            AND gp.role = 'Admin'
        )
    );
