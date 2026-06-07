-- ============================================
-- Account Status Column for User Management
-- ============================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'warned', 'suspended', 'banned'));

-- Set all existing users to active
UPDATE public.profiles SET account_status = 'active' WHERE account_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
