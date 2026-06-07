-- ============================================
-- User Reports System
-- ============================================

CREATE TABLE IF NOT EXISTS user_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason          TEXT NOT NULL,
    description     TEXT,
    status          TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewed', 'Resolved', 'Dismissed')),
    created_at      TIMESTAMPTZ DEFAULT now(),
    resolved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created ON user_reports(created_at DESC);

-- Enable RLS
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for clean re-runs
DROP POLICY IF EXISTS "Reporters can view own reports" ON user_reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON user_reports;
DROP POLICY IF EXISTS "Users can view own reports, admins can view all" ON user_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON user_reports;

-- SELECT: reporters see own reports, admins see all
CREATE POLICY "Users can view own reports, admins can view all"
    ON user_reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid() OR public.is_admin(auth.uid()));

-- INSERT: any authenticated user can submit a report
CREATE POLICY "Authenticated users can create reports"
    ON user_reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: only admins can change status
CREATE POLICY "Admins can update reports"
    ON user_reports FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
