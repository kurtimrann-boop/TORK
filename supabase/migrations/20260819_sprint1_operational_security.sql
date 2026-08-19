-- ============================================================
-- TORK — Sprint 1: Operational Security Core
-- ============================================================
-- Purpose:
--   1) Add POD verification states to transport_documents
--   2) Extend transports status CHECK constraint for POD lifecycle
--   3) Enforce single active transport per carrier (DB-level guard)
--   4) Update accept_bid_and_assign_load with single active transport check & concurrency lock
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Update transports status CHECK constraint
-- ------------------------------------------------------------
ALTER TABLE public.transports DROP CONSTRAINT IF EXISTS transports_status_check;

ALTER TABLE public.transports ADD CONSTRAINT transports_status_check CHECK (
  status IN (
    'assigned',
    'pickup_pending',
    'in_transit',
    'pod_pending',
    'pod_uploaded',
    'pod_verifying',
    'pod_verified',
    'delivered',
    'settlement_pending',
    'settled',
    'cancelled'
  )
);

-- ------------------------------------------------------------
-- 2) Add verification tracking to transport_documents
-- ------------------------------------------------------------
ALTER TABLE public.transport_documents
  ADD COLUMN IF NOT EXISTS verification_status text CHECK (verification_status IN ('pending', 'uploaded', 'verifying', 'verified', 'rejected')) DEFAULT 'pending';

ALTER TABLE public.transport_documents
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.transport_documents
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.transport_documents
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- ------------------------------------------------------------
-- 3) DB-level guard: single active transport per carrier
-- ------------------------------------------------------------
-- Active states = anything that is NOT final/terminal (settled/cancelled)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transports_carrier_active_unique
  ON public.transports(carrier_id)
  WHERE status IN (
    'assigned',
    'pickup_pending',
    'in_transit',
    'pod_pending',
    'pod_uploaded',
    'pod_verifying',
    'pod_verified',
    'delivered',
    'settlement_pending'
  );

-- Also guard at bids level: a carrier cannot have two ACCEPTED bids simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_carrier_accepted_unique
  ON public.bids(carrier_id)
  WHERE status = 'accepted';

-- ------------------------------------------------------------
-- 4) Update accept_bid_and_assign_load with concurrency & active transport checks
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_bid_and_assign_load(
  p_bid_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_load_id uuid;
  v_bid public.bids%ROWTYPE;
  v_load public.loads%ROWTYPE;
  v_transport public.transports%ROWTYPE;
  v_updated_bid public.bids%ROWTYPE;
  v_updated_load public.loads%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF public.current_user_role() IS DISTINCT FROM 'shipper' THEN
    RAISE EXCEPTION 'Only shipper role can accept bids and assign loads';
  END IF;

  SELECT load_id
    INTO v_load_id
  FROM public.bids
  WHERE id = p_bid_id;

  IF v_load_id IS NULL THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;

  SELECT *
    INTO v_load
  FROM public.loads
  WHERE id = v_load_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attached load not found';
  END IF;

  IF v_load.shipper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the load owner can accept bids';
  END IF;

  IF v_load.status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Load must be in open status to accept bids';
  END IF;

  SELECT *
    INTO v_bid
  FROM public.bids
  WHERE id = p_bid_id
    AND load_id = v_load.id
  FOR UPDATE;

  IF v_bid.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Only pending bids can be accepted';
  END IF;

  -- Carrier Active Transport Guard 1: Check existing active transport
  IF EXISTS (
    SELECT 1 FROM public.transports
    WHERE carrier_id = v_bid.carrier_id
      AND status IN (
        'assigned',
        'pickup_pending',
        'in_transit',
        'pod_pending',
        'pod_uploaded',
        'pod_verifying',
        'pod_verified',
        'delivered',
        'settlement_pending'
      )
  ) THEN
    RAISE EXCEPTION 'Carrier already has an active transport in progress. A carrier can only have one active transport at a time.';
  END IF;

  -- Carrier Active Transport Guard 2: Check existing accepted bids
  IF EXISTS (
    SELECT 1 FROM public.bids
    WHERE carrier_id = v_bid.carrier_id
      AND status = 'accepted'
      AND id IS DISTINCT FROM p_bid_id
  ) THEN
    RAISE EXCEPTION 'Carrier already has an active accepted bid. A carrier can only have one active transport at a time.';
  END IF;

  -- Concurrency guard: shipper's load must still be open
  IF v_load.status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'Load is no longer open for assignment';
  END IF;

  UPDATE public.bids
  SET status = 'accepted'
  WHERE id = p_bid_id
    AND status = 'pending'
  RETURNING *
  INTO v_updated_bid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid could not be accepted';
  END IF;

  UPDATE public.bids
  SET status = 'rejected'
  WHERE load_id = v_load.id
    AND id IS DISTINCT FROM p_bid_id
    AND status = 'pending';

  UPDATE public.loads
  SET status = 'assigned'
  WHERE id = v_load.id
    AND status = 'open'
  RETURNING *
  INTO v_updated_load;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Load could not be assigned';
  END IF;

  -- Create transport record
  INSERT INTO public.transports (
    load_id,
    bid_id,
    carrier_id,
    shipper_id,
    status,
    estimated_distance_km,
    estimated_duration_minutes,
    estimated_bid_amount
  ) VALUES (
    v_load.id,
    v_bid.id,
    v_bid.carrier_id,
    v_load.shipper_id,
    'assigned',
    v_load.distance_km,
    v_load.duration_minutes,
    v_bid.amount
  )
  ON CONFLICT (bid_id) DO NOTHING
  RETURNING *
  INTO v_transport;

  RETURN jsonb_build_object(
    'bid', row_to_json(v_updated_bid),
    'load', row_to_json(v_updated_load),
    'transport', row_to_json(v_transport)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_bid_and_assign_load(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_bid_and_assign_load(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 5) End transaction
-- ------------------------------------------------------------
COMMIT;

