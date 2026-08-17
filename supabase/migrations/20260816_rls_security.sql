-- ============================================================
-- TORK RLS Security Baseline
-- ============================================================
-- Purpose:
--   - enable RLS on profiles, loads, bids
--   - block direct user mutation of immutable identity fields
--   - restrict access by ownership and role
--   - add secure bid status transition helper
--
-- Notes:
--   - This is a read-only migration plan file only.
--   - It intentionally does not mutate live data.
--   - It does not modify existing tables, columns, FK, or CHECK constraints.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Helper: current user role
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- ------------------------------------------------------------
-- 2) Trigger: block immutable fields on profiles
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_immutable_identity_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id is immutable';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_immutable_identity_guard_trigger ON public.profiles;
CREATE TRIGGER profiles_immutable_identity_guard_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.profiles_immutable_identity_guard();

REVOKE ALL ON FUNCTION public.profiles_immutable_identity_guard() FROM PUBLIC;

-- ------------------------------------------------------------
-- 3) Trigger: block immutable owner on loads
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.loads_immutable_owner_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.shipper_id IS DISTINCT FROM OLD.shipper_id THEN
    RAISE EXCEPTION 'loads.shipper_id is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS loads_immutable_owner_guard_trigger ON public.loads;
CREATE TRIGGER loads_immutable_owner_guard_trigger
BEFORE UPDATE ON public.loads
FOR EACH ROW
EXECUTE FUNCTION public.loads_immutable_owner_guard();

REVOKE ALL ON FUNCTION public.loads_immutable_owner_guard() FROM PUBLIC;

-- ------------------------------------------------------------
-- 4) Trigger: block direct mutation of bids identity only
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bids_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'bids.id is immutable';
  END IF;

  IF NEW.load_id IS DISTINCT FROM OLD.load_id THEN
    RAISE EXCEPTION 'bids.load_id is immutable';
  END IF;

  IF NEW.carrier_id IS DISTINCT FROM OLD.carrier_id THEN
    RAISE EXCEPTION 'bids.carrier_id is immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bids_immutable_guard_trigger ON public.bids;
CREATE TRIGGER bids_immutable_guard_trigger
BEFORE UPDATE ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.bids_immutable_guard();

REVOKE ALL ON FUNCTION public.bids_immutable_guard() FROM PUBLIC;

-- ------------------------------------------------------------
-- 5) RPC: secure shipper-only bid status transition
-- ------------------------------------------------------------
-- IMPORTANT:
--   - search_path is pinned to public, pg_catalog to reduce shadowing risk
--   - the function is not granted to PUBLIC or anon
--   - ownership is the database role that creates the migration; no service-role
--     secret is used in browser code or SQL here
CREATE OR REPLACE FUNCTION public.set_bid_status(
  p_bid_id uuid,
  p_new_status text
)
RETURNS public.bids
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_load public.loads%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_new_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Only accepted or rejected are allowed';
  END IF;

  SELECT *
    INTO v_bid
  FROM public.bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;

  IF v_bid.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Only pending bids can be accepted or rejected';
  END IF;

  SELECT *
    INTO v_load
  FROM public.loads
  WHERE id = v_bid.load_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attached load not found';
  END IF;

  IF v_load.shipper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the load owner can accept or reject bids';
  END IF;

  IF public.current_user_role() IS DISTINCT FROM 'shipper' THEN
    RAISE EXCEPTION 'Only shipper role can accept or reject bids';
  END IF;

  UPDATE public.bids
  SET status = p_new_status
  WHERE id = p_bid_id
    AND status = 'pending'
  RETURNING *
  INTO v_bid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bid is no longer pending or could not be updated';
  END IF;

  RETURN v_bid;
END;
$$;

REVOKE ALL ON FUNCTION public.set_bid_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_bid_status(uuid, text) TO authenticated;

-- ------------------------------------------------------------
-- 6) Enable RLS
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 7) Profiles policies
-- ------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- No delete policy for profiles at this stage.

-- ------------------------------------------------------------
-- 8) Loads policies
-- ------------------------------------------------------------
DROP POLICY IF EXISTS loads_insert_own_shipper ON public.loads;
CREATE POLICY loads_insert_own_shipper
ON public.loads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.current_user_role() = 'shipper'
  AND shipper_id = auth.uid()
);

DROP POLICY IF EXISTS loads_select_own_shipper ON public.loads;
CREATE POLICY loads_select_own_shipper
ON public.loads
FOR SELECT
TO authenticated
USING (shipper_id = auth.uid());

DROP POLICY IF EXISTS loads_select_open_for_carrier ON public.loads;
CREATE POLICY loads_select_open_for_carrier
ON public.loads
FOR SELECT
TO authenticated
USING (
  status = 'open'
  AND public.current_user_role() = 'carrier'
);

DROP POLICY IF EXISTS loads_update_own_shipper ON public.loads;
CREATE POLICY loads_update_own_shipper
ON public.loads
FOR UPDATE
TO authenticated
USING (shipper_id = auth.uid())
WITH CHECK (shipper_id = auth.uid());

DROP POLICY IF EXISTS loads_delete_own_shipper ON public.loads;
CREATE POLICY loads_delete_own_shipper
ON public.loads
FOR DELETE
TO authenticated
USING (shipper_id = auth.uid());

-- ------------------------------------------------------------
-- 9) Bids policies
-- ------------------------------------------------------------
DROP POLICY IF EXISTS bids_insert_own_carrier ON public.bids;
CREATE POLICY bids_insert_own_carrier
ON public.bids
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.current_user_role() = 'carrier'
  AND carrier_id = auth.uid()
);

DROP POLICY IF EXISTS bids_select_own_carrier ON public.bids;
CREATE POLICY bids_select_own_carrier
ON public.bids
FOR SELECT
TO authenticated
USING (carrier_id = auth.uid());

DROP POLICY IF EXISTS bids_select_for_own_load_shipper ON public.bids;
CREATE POLICY bids_select_for_own_load_shipper
ON public.bids
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.loads l
    WHERE l.id = bids.load_id
      AND l.shipper_id = auth.uid()
  )
);

-- Intentionally no generic bids UPDATE policy.
-- Direct client UPDATE is blocked by the absence of an UPDATE policy.
-- Status transitions must go through public.set_bid_status().

DROP POLICY IF EXISTS bids_delete_own_carrier_pending ON public.bids;
CREATE POLICY bids_delete_own_carrier_pending
ON public.bids
FOR DELETE
TO authenticated
USING (
  carrier_id = auth.uid()
  AND status = 'pending'
);

-- ------------------------------------------------------------
-- 10) End transaction
-- ------------------------------------------------------------
COMMIT;
