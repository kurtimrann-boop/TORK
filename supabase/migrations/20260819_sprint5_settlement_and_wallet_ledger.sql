-- ============================================================
-- TORK — Sprint 5: Settlement & Wallet Ledger Migration
-- ============================================================

BEGIN;

-- 1) Table: wallet_transactions (Immutable Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  settlement_id uuid NOT NULL UNIQUE REFERENCES public.settlements(id) ON DELETE CASCADE,
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('settlement_payout', 'adjustment', 'withdrawal')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'disputed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

-- 2) Table: settlement_disputes (Structured Financial Disputes)
CREATE TABLE IF NOT EXISTS public.settlement_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  opened_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'resolved', 'dismissed')) DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_tx_carrier_id ON public.wallet_transactions(carrier_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_settlement_id ON public.wallet_transactions(settlement_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_settlement_disputes_settlement_id ON public.settlement_disputes(settlement_id);

-- 4) RLS Security
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_disputes ENABLE ROW LEVEL SECURITY;

-- Carrier can only view own wallet transactions
CREATE POLICY "wallet_tx_carrier_select" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (carrier_id = auth.uid());

-- Disputes visible to carrier and shipper of the transport
CREATE POLICY "disputes_parties_select" ON public.settlement_disputes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transports t 
    WHERE t.id = settlement_disputes.transport_id 
      AND (t.carrier_id = auth.uid() OR t.shipper_id = auth.uid())
  ));

CREATE POLICY "disputes_parties_insert" ON public.settlement_disputes
  FOR INSERT TO authenticated
  WITH CHECK (opened_by = auth.uid());

COMMIT;
