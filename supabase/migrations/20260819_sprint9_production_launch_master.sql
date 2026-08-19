-- =========================================================================
-- TORK — Sprint 9: Master Production Launch & Database Activation Migration
-- =========================================================================
-- Non-destructive, idempotent, enterprise-grade schema initialization.
-- Safe to execute against any existing PostgreSQL / Supabase database.
-- =========================================================================

BEGIN;

-- 1) EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  company_name text,
  tax_number text,
  phone text,
  role text NOT NULL CHECK (role IN ('shipper', 'carrier', 'operator', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) LOADS TABLE
CREATE TABLE IF NOT EXISTS public.loads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  cargo_type text,
  body_type text,
  weight_tonnage numeric CHECK (weight_tonnage IS NULL OR weight_tonnage > 0),
  volume_m3 numeric CHECK (volume_m3 IS NULL OR volume_m3 > 0),
  distance_km numeric CHECK (distance_km IS NULL OR distance_km > 0),
  budget numeric CHECK (budget IS NULL OR budget > 0),
  notes text,
  status text NOT NULL CHECK (status IN ('open', 'assigned', 'in_transit', 'delivered', 'completed', 'cancelled')) DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) BIDS TABLE
CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0 AND amount <= 10000000),
  notes text,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) TRANSPORTS TABLE
CREATE TABLE IF NOT EXISTS public.transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES public.loads(id) ON DELETE RESTRICT,
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  shipper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  bid_id uuid NOT NULL REFERENCES public.bids(id) ON DELETE RESTRICT,
  estimated_bid_amount numeric NOT NULL CHECK (estimated_bid_amount > 0),
  actual_cost_total numeric CHECK (actual_cost_total IS NULL OR actual_cost_total >= 0),
  actual_profit numeric,
  actual_margin_percent numeric,
  status text NOT NULL CHECK (status IN ('assigned', 'pickup_pending', 'in_transit', 'delivered', 'settled', 'cancelled')) DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  delivered_at timestamptz,
  settled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6) TRANSPORT DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.transport_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('POD', 'WAYBILL', 'INVOICE', 'PHOTO', 'OTHER')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes integer CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  mime_type text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verification_status text NOT NULL CHECK (verification_status IN ('uploaded', 'verified', 'rejected')) DEFAULT 'uploaded',
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7) SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE RESTRICT,
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  shipper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  bid_amount numeric NOT NULL CHECK (bid_amount > 0),
  settlement_amount numeric NOT NULL CHECK (settlement_amount > 0),
  estimated_cost numeric CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  actual_cost numeric CHECK (actual_cost IS NULL OR actual_cost >= 0),
  estimated_profit numeric,
  actual_profit numeric,
  estimated_margin_percent numeric,
  actual_margin_percent numeric,
  status text NOT NULL CHECK (status IN ('draft', 'pending_pod', 'ready', 'approved', 'paid', 'disputed', 'cancelled')) DEFAULT 'draft',
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8) WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  settlement_id uuid NOT NULL REFERENCES public.settlements(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('settlement_payout', 'withdrawal', 'adjustment')),
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'completed',
  route_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9) SETTLEMENT DISPUTES TABLE
CREATE TABLE IF NOT EXISTS public.settlement_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  opened_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')) DEFAULT 'open',
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- 10) TRANSPORT CANCELLATIONS TABLE
CREATE TABLE IF NOT EXISTS public.transport_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_role text NOT NULL CHECK (requester_role IN ('shipper', 'carrier')),
  reason text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- 11) AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12) OPERATIONAL ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.operational_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  alert_type text NOT NULL,
  transport_id uuid REFERENCES public.transports(id) ON DELETE CASCADE,
  carrier_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  settlement_id uuid REFERENCES public.settlements(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved')) DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- =========================================================================
-- UNIQUE CONSTRAINTS & ATOMIC CONCURRENCY GUARDS
-- =========================================================================

-- Carrier Single Active Transport Constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_carrier_single_active_transport 
  ON public.transports(carrier_id) 
  WHERE status IN ('assigned', 'pickup_pending', 'in_transit');

-- Idempotent Completed Settlement Payout (Single completed credit per settlement)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_settlement_completed_unique 
  ON public.wallet_transactions(settlement_id) 
  WHERE status = 'completed';

-- Single Pending Mutual Cancellation per Transport
CREATE UNIQUE INDEX IF NOT EXISTS idx_cancellation_pending_unique 
  ON public.transport_cancellations(transport_id) 
  WHERE status = 'pending';

-- Single Accepted Bid per Load
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_single_accepted_per_load 
  ON public.bids(load_id) 
  WHERE status = 'accepted';

-- =========================================================================
-- HIGH-PERFORMANCE QUERY INDEXES
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_loads_status_created ON public.loads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loads_shipper ON public.loads(shipper_id);
CREATE INDEX IF NOT EXISTS idx_bids_load ON public.bids(load_id);
CREATE INDEX IF NOT EXISTS idx_bids_carrier ON public.bids(carrier_id);
CREATE INDEX IF NOT EXISTS idx_transports_carrier_status ON public.transports(carrier_id, status);
CREATE INDEX IF NOT EXISTS idx_transports_shipper_status ON public.transports(shipper_id, status);
CREATE INDEX IF NOT EXISTS idx_transports_load ON public.transports(load_id);
CREATE INDEX IF NOT EXISTS idx_settlements_transport ON public.settlements(transport_id);
CREATE INDEX IF NOT EXISTS idx_settlements_carrier ON public.settlements(carrier_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_carrier ON public.wallet_transactions(carrier_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON public.operational_alerts(status, severity);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

-- 1) Profiles: Users can read/update own profile
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- 2) Loads: Shippers manage own loads; carriers can view open loads
CREATE POLICY "loads_shipper_all" ON public.loads FOR ALL USING (shipper_id = auth.uid());
CREATE POLICY "loads_carrier_select_open" ON public.loads FOR SELECT USING (status = 'open');

-- 3) Bids: Carriers manage own bids; shippers view bids on their loads
CREATE POLICY "bids_carrier_all" ON public.bids FOR ALL USING (carrier_id = auth.uid());
CREATE POLICY "bids_shipper_select" ON public.bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.loads l WHERE l.id = bids.load_id AND l.shipper_id = auth.uid())
);

-- 4) Transports: Shipper and Carrier parties can select own transports
CREATE POLICY "transports_parties_select" ON public.transports FOR SELECT USING (
  carrier_id = auth.uid() OR shipper_id = auth.uid()
);

-- 5) Settlements: Carrier and Shipper parties can select own settlements
CREATE POLICY "settlements_parties_select" ON public.settlements FOR SELECT USING (
  carrier_id = auth.uid() OR shipper_id = auth.uid()
);

-- 6) Wallet Transactions: Carriers view own ledger
CREATE POLICY "wallet_carrier_select" ON public.wallet_transactions FOR SELECT USING (
  carrier_id = auth.uid()
);

-- 7) Admin & Operator Global Oversight
CREATE POLICY "admin_audit_logs_select" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'operator'))
);
CREATE POLICY "admin_alerts_all" ON public.operational_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'operator'))
);

COMMIT;
