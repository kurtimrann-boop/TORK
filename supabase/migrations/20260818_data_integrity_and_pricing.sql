-- ============================================================
-- TORK — Data Integrity & Pricing Foundation
-- ============================================================
-- Purpose:
--   1) Prevent duplicate pending bids for the same carrier and load
--      via partial unique index: UNIQUE(carrier_id, load_id) WHERE status = 'pending'
--   2) Add persistent nullable distance_km and duration_minutes columns to loads table
--   3) Preserve historical accepted/rejected bid audit trail
--
-- Safety:
--   - Non-destructive (nullable columns)
--   - Partial index ensures only active pending bids are deduplicated
--   - Fully compatible with existing RLS policies
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Partial Unique Index on Bids: (carrier_id, load_id) for 'pending' bids
-- ------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS bids_carrier_load_pending_unique
ON public.bids (carrier_id, load_id)
WHERE status = 'pending';

-- ------------------------------------------------------------
-- 2) Add nullable distance and duration columns to loads
-- ------------------------------------------------------------
ALTER TABLE public.loads
ADD COLUMN IF NOT EXISTS distance_km numeric(8, 2);

ALTER TABLE public.loads
ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- ------------------------------------------------------------
-- 3) End transaction
-- ------------------------------------------------------------
COMMIT;
