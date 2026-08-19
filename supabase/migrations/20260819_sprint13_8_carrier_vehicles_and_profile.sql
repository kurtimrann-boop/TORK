-- =====================================================================
-- TORK MIGRATION: 20260819_sprint13_8_carrier_vehicles_and_profile.sql
-- Carrier Vehicles & Profile Extension (Non-Destructive)
-- =====================================================================

-- 1. Ensure avatar_url on profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url text;
    END IF;
END $$;

-- 2. Carrier Vehicles Table
CREATE TABLE IF NOT EXISTS public.carrier_vehicles (
    id text PRIMARY KEY,
    carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plate_number text NOT NULL,
    vehicle_type text NOT NULL DEFAULT 'TIR', -- 'TIR', 'KAMYON', 'KAMYONET', 'ONTEKER'
    brand text NOT NULL,
    model text NOT NULL,
    model_year integer,
    capacity_tons numeric(5, 2) NOT NULL DEFAULT 24.0,
    trailer_type text DEFAULT 'Tenteli', -- 'Tenteli', 'Frigo', 'Açık Kasa', 'Konteyner', 'Damper'
    verification_status text NOT NULL DEFAULT 'unverified', -- 'unverified', 'pending_review', 'verified', 'rejected'
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for carrier lookup and plate uniqueness per carrier
CREATE INDEX IF NOT EXISTS idx_carrier_vehicles_carrier_id ON public.carrier_vehicles(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_vehicles_plate ON public.carrier_vehicles(plate_number);

-- 3. Enable RLS
ALTER TABLE public.carrier_vehicles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Carrier Vehicles
DROP POLICY IF EXISTS "Carriers can view own vehicles" ON public.carrier_vehicles;
CREATE POLICY "Carriers can view own vehicles"
    ON public.carrier_vehicles
    FOR SELECT
    USING (auth.uid() = carrier_id);

DROP POLICY IF EXISTS "Carriers can insert own vehicles" ON public.carrier_vehicles;
CREATE POLICY "Carriers can insert own vehicles"
    ON public.carrier_vehicles
    FOR INSERT
    WITH CHECK (auth.uid() = carrier_id);

DROP POLICY IF EXISTS "Carriers can update own vehicles" ON public.carrier_vehicles;
CREATE POLICY "Carriers can update own vehicles"
    ON public.carrier_vehicles
    FOR UPDATE
    USING (auth.uid() = carrier_id);

DROP POLICY IF EXISTS "Carriers can delete own vehicles" ON public.carrier_vehicles;
CREATE POLICY "Carriers can delete own vehicles"
    ON public.carrier_vehicles
    FOR DELETE
    USING (auth.uid() = carrier_id);

DROP POLICY IF EXISTS "Operators and Admins can view all vehicles" ON public.carrier_vehicles;
CREATE POLICY "Operators and Admins can view all vehicles"
    ON public.carrier_vehicles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'operator')
        )
    );
