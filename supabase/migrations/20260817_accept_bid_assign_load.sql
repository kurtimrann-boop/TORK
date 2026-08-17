-- ============================================================
-- TORK — Accept Bid & Assign Load
-- ============================================================
-- Purpose:
--   - atomic shipper-only bid acceptance + load assignment
--   - reject remaining pending bids for the same load
--   - keep existing set_bid_status() untouched for plain reject
--
-- Concurrency:
--   - load is locked BEFORE bid in every execution path
--   - this serializes concurrent accepts on the same load
--   - prevents deadlock by deterministic lock ordering
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) RPC: accept bid and assign load atomically
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

  RETURN jsonb_build_object(
    'bid', row_to_json(v_updated_bid),
    'load', row_to_json(v_updated_load)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_bid_and_assign_load(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_bid_and_assign_load(uuid) TO authenticated;

-- ------------------------------------------------------------
-- 2) End transaction
-- ------------------------------------------------------------
COMMIT;
