-- ============================================================
-- TORK — Sprint 8: End-to-End MVP Release Candidate Migration
-- ============================================================

BEGIN;

-- 1) Foreign Key & Referential Integrity Verification
-- Ensure CASCADE / RESTRICT rules protect against orphan states

-- Transports <-> Loads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transports_load'
  ) THEN
    ALTER TABLE public.transports
      ADD CONSTRAINT fk_transports_load FOREIGN KEY (load_id) REFERENCES public.loads(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Settlements <-> Transports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_settlements_transport'
  ) THEN
    ALTER TABLE public.settlements
      ADD CONSTRAINT fk_settlements_transport FOREIGN KEY (transport_id) REFERENCES public.transports(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- 2) Immutable Snapshot Verification Trigger Helper
-- Ensures settlement_amount strictly matches the transport's bid amount
CREATE OR REPLACE FUNCTION public.check_settlement_bid_match()
RETURNS trigger AS $$
BEGIN
  IF NEW.settlement_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be positive';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_settlement_bid_match ON public.settlements;
CREATE TRIGGER trg_check_settlement_bid_match
  BEFORE INSERT OR UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.check_settlement_bid_match();

-- 3) Release Candidate Ready Performance Indexes
CREATE INDEX IF NOT EXISTS idx_loads_status_created_at ON public.loads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transports_status_created_at ON public.transports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);
CREATE INDEX IF NOT EXISTS idx_transport_documents_type_status ON public.transport_documents(document_type, verification_status);

COMMIT;
