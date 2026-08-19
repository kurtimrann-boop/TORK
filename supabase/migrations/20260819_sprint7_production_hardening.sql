-- ============================================================
-- TORK — Sprint 7: Production Hardening & Concurrency Integrity
-- ============================================================

BEGIN;

-- 1) Single Active Transport per Carrier Concurrency Constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_carrier_single_active_transport 
  ON public.transports(carrier_id) 
  WHERE status IN ('assigned', 'pickup_pending', 'in_transit');

-- 2) Idempotent Settlement Payout: At most one completed wallet credit per settlement
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_settlement_completed_unique 
  ON public.wallet_transactions(settlement_id) 
  WHERE status = 'completed';

-- 3) Single Active Mutual Cancellation Request per Transport
CREATE UNIQUE INDEX IF NOT EXISTS idx_cancellation_pending_unique 
  ON public.transport_cancellations(transport_id) 
  WHERE status = 'pending';

-- 4) Single Accepted Bid per Load
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_single_accepted_per_load 
  ON public.bids(load_id) 
  WHERE status = 'accepted';

-- 5) Financial Constraints & Safety Checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_bids_positive_amount'
  ) THEN
    ALTER TABLE public.bids ADD CONSTRAINT chk_bids_positive_amount CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_settlement_positive_amount'
  ) THEN
    ALTER TABLE public.settlements ADD CONSTRAINT chk_settlement_positive_amount CHECK (settlement_amount > 0);
  END IF;
END $$;

-- 6) Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transports_carrier_status ON public.transports(carrier_id, status);
CREATE INDEX IF NOT EXISTS idx_transports_load_id ON public.transports(load_id);
CREATE INDEX IF NOT EXISTS idx_settlements_transport_id ON public.settlements(transport_id);
CREATE INDEX IF NOT EXISTS idx_settlements_carrier_status ON public.settlements(carrier_id, status);
CREATE INDEX IF NOT EXISTS idx_bids_load_carrier ON public.bids(load_id, carrier_id);

COMMIT;
