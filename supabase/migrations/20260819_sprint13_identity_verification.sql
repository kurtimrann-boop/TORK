-- =====================================================================
-- TORK MIGRATION: 20260819_sprint13_identity_verification.sql
-- Carrier Identity & Phone Verification Tables, Columns & RLS
-- =====================================================================

-- 1. Profiles verification columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_number text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_verified boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_verified_at') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_verified_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'identity_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN identity_verified boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'identity_verified_at') THEN
        ALTER TABLE public.profiles ADD COLUMN identity_verified_at timestamptz;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_level') THEN
        ALTER TABLE public.profiles ADD COLUMN verification_level text DEFAULT 'UNVERIFIED';
    END IF;
END $$;

-- 2. Phone Verifications Table
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    phone_number text NOT NULL,
    otp_hash text NOT NULL,
    otp_salt text NOT NULL,
    attempts_count integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    status text NOT NULL DEFAULT 'pending',
    expires_at timestamptz NOT NULL,
    verified_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 3. Identity Documents Table (Driver's License / Ehliyet)
CREATE TABLE IF NOT EXISTS public.identity_documents (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_type text NOT NULL DEFAULT 'DRIVERS_LICENSE',
    file_path text NOT NULL,
    mime_type text NOT NULL,
    file_size_bytes bigint NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    ocr_data jsonb,
    ocr_confidence numeric,
    rejection_reason text,
    reviewer_id uuid REFERENCES public.profiles(id),
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Verification Events Table
CREATE TABLE IF NOT EXISTS public.verification_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    status_from text,
    status_to text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON public.phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_identity_documents_user_id ON public.identity_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_documents_status ON public.identity_documents(status);
CREATE INDEX IF NOT EXISTS idx_verification_events_user ON public.verification_events(user_id);

-- 6. Row-Level Security (RLS)
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see/manage their own phone verifications
CREATE POLICY phone_verifications_owner_policy ON public.phone_verifications
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS: Users can only view/insert their own documents; Operators can view/review all
CREATE POLICY identity_documents_owner_select ON public.identity_documents
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'operator'))
    );

CREATE POLICY identity_documents_owner_insert ON public.identity_documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY identity_documents_operator_update ON public.identity_documents
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'operator'))
    );

-- RLS: Verification events
CREATE POLICY verification_events_owner_policy ON public.verification_events
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'operator'))
    );
