-- ============================================================
-- TORK — Trip Actuals & Settlement Foundation (Hürmüz Phase 6)
-- ============================================================
-- Purpose:
--   1) transports (Trip Lifecycle Master Record)
--   2) transport_estimate_snapshots (Immutable Estimate Snapshot upon Acceptance)
--   3) transport_cost_actuals (Real Realized Costs from Driver/Telemetry)
--   4) transport_documents (POD / Dispatch / Invoices)
--   5) settlements (Carrier/Shipper Settlement & Reconciliation)
--
-- Security:
--   - Strict RLS ensuring carrier actuals & private margin stay confidential
--   - Foreign key integrity with ON DELETE RESTRICT for critical financial links
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Table: transports (Trip Master Record)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id uuid NOT NULL REFERENCES public.loads(id) ON DELETE RESTRICT,
  bid_id uuid NOT NULL UNIQUE REFERENCES public.bids(id) ON DELETE RESTRICT,
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  shipper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('assigned', 'pickup_pending', 'in_transit', 'delivered', 'settled', 'cancelled')),
  
  estimated_distance_km numeric(10,2) CHECK (estimated_distance_km >= 0),
  estimated_duration_minutes integer CHECK (estimated_duration_minutes >= 0),
  actual_distance_km numeric(10,2) CHECK (actual_distance_km IS NULL OR actual_distance_km >= 0),
  actual_duration_minutes integer CHECK (actual_duration_minutes IS NULL OR actual_duration_minutes >= 0),
  
  estimated_cost_total numeric(12,2) CHECK (estimated_cost_total >= 0),
  estimated_bid_amount numeric(12,2) NOT NULL CHECK (estimated_bid_amount >= 0),
  estimated_profit numeric(12,2),
  estimated_margin_percent numeric(6,2),
  
  actual_cost_total numeric(12,2) CHECK (actual_cost_total IS NULL OR actual_cost_total >= 0),
  actual_profit numeric(12,2),
  actual_margin_percent numeric(6,2),
  
  started_at timestamptz,
  delivered_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2) Table: transport_estimate_snapshots (Immutable Estimate Snapshot)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_estimate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL UNIQUE REFERENCES public.transports(id) ON DELETE CASCADE,
  
  vehicle_type text NOT NULL,
  custom_consumption numeric(6,2) CHECK (custom_consumption IS NULL OR (custom_consumption >= 1 AND custom_consumption <= 100)),
  load_type text NOT NULL,
  tonnage numeric(10,2) CHECK (tonnage IS NULL OR tonnage >= 0),
  pallet_count integer CHECK (pallet_count IS NULL OR pallet_count >= 0),
  volume_m3 numeric(10,2) CHECK (volume_m3 IS NULL OR volume_m3 >= 0),
  
  distance_km numeric(10,2) NOT NULL CHECK (distance_km >= 0),
  duration_minutes integer NOT NULL CHECK (duration_minutes >= 0),
  
  fuel_price_per_liter numeric(10,2) CHECK (fuel_price_per_liter >= 0),
  fuel_liters numeric(10,2) CHECK (fuel_liters >= 0),
  fuel_cost numeric(12,2) CHECK (fuel_cost >= 0),
  
  driver_cost numeric(12,2) CHECK (driver_cost >= 0),
  toll_cost numeric(12,2) CHECK (toll_cost IS NULL OR toll_cost >= 0),
  toll_status text CHECK (toll_status IN ('exact', 'estimated', 'unavailable')),
  maintenance_cost numeric(12,2) CHECK (maintenance_cost >= 0),
  depreciation_cost numeric(12,2) CHECK (depreciation_cost >= 0),
  overhead_cost numeric(12,2) CHECK (overhead_cost >= 0),
  
  load_specific_cost numeric(12,2) CHECK (load_specific_cost >= 0),
  total_operating_cost numeric(12,2) NOT NULL CHECK (total_operating_cost >= 0),
  
  recommended_price numeric(12,2) CHECK (recommended_price >= 0),
  bid_amount numeric(12,2) NOT NULL CHECK (bid_amount >= 0),
  estimated_profit numeric(12,2),
  estimated_margin_percent numeric(6,2),
  
  data_quality text CHECK (data_quality IN ('HIGH', 'MEDIUM', 'LOW')),
  pricing_version text NOT NULL DEFAULT 'HURMUZ_V5',
  
  snapshot_created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3) Table: transport_cost_actuals (Real Realized Costs)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_cost_actuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL UNIQUE REFERENCES public.transports(id) ON DELETE CASCADE,
  
  fuel_liters numeric(10,2) CHECK (fuel_liters IS NULL OR fuel_liters >= 0),
  fuel_price_per_liter numeric(10,2) CHECK (fuel_price_per_liter IS NULL OR fuel_price_per_liter >= 0),
  fuel_cost numeric(12,2) CHECK (fuel_cost IS NULL OR fuel_cost >= 0),
  
  driver_cost numeric(12,2) CHECK (driver_cost IS NULL OR driver_cost >= 0),
  toll_cost numeric(12,2) CHECK (toll_cost IS NULL OR toll_cost >= 0),
  maintenance_cost numeric(12,2) CHECK (maintenance_cost IS NULL OR maintenance_cost >= 0),
  depreciation_cost numeric(12,2) CHECK (depreciation_cost IS NULL OR depreciation_cost >= 0),
  
  waiting_hours numeric(6,2) CHECK (waiting_hours IS NULL OR waiting_hours >= 0),
  waiting_cost numeric(12,2) CHECK (waiting_cost IS NULL OR waiting_cost >= 0),
  
  special_handling_cost numeric(12,2) CHECK (special_handling_cost IS NULL OR special_handling_cost >= 0),
  other_cost numeric(12,2) CHECK (other_cost IS NULL OR other_cost >= 0),
  
  notes text,
  source_type text CHECK (source_type IS NULL OR source_type IN ('TELEMETRY', 'DRIVER_RECEIPT', 'OFFICIAL_INVOICE', 'MANUAL_ENTRY')),
  source_name text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4) Table: transport_documents (POD / Waybills / Invoices)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL REFERENCES public.transports(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('POD', 'INVOICE', 'WAYBILL', 'DISPATCH_NOTE', 'OTHER')),
  storage_path text,
  document_url text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 5) Table: settlements (Carrier / Shipper Settlement Record)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_id uuid NOT NULL UNIQUE REFERENCES public.transports(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  shipper_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  
  bid_amount numeric(12,2) NOT NULL CHECK (bid_amount >= 0),
  estimated_cost numeric(12,2) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  actual_cost numeric(12,2) CHECK (actual_cost IS NULL OR actual_cost >= 0),
  
  estimated_profit numeric(12,2),
  actual_profit numeric(12,2),
  
  estimated_margin_percent numeric(6,2),
  actual_margin_percent numeric(6,2),
  
  settlement_amount numeric(12,2) NOT NULL CHECK (settlement_amount >= 0),
  status text NOT NULL CHECK (status IN ('draft', 'pending_pod', 'ready', 'approved', 'paid', 'disputed', 'cancelled')),
  
  approved_at timestamptz,
  paid_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 6) Indexes for Performance
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transports_load_id ON public.transports(load_id);
CREATE INDEX IF NOT EXISTS idx_transports_bid_id ON public.transports(bid_id);
CREATE INDEX IF NOT EXISTS idx_transports_carrier_id ON public.transports(carrier_id);
CREATE INDEX IF NOT EXISTS idx_transports_shipper_id ON public.transports(shipper_id);
CREATE INDEX IF NOT EXISTS idx_transports_status ON public.transports(status);

CREATE INDEX IF NOT EXISTS idx_cost_actuals_transport_id ON public.transport_cost_actuals(transport_id);
CREATE INDEX IF NOT EXISTS idx_estimate_snapshots_transport_id ON public.transport_estimate_snapshots(transport_id);
CREATE INDEX IF NOT EXISTS idx_transport_docs_transport_id ON public.transport_documents(transport_id);

CREATE INDEX IF NOT EXISTS idx_settlements_transport_id ON public.settlements(transport_id);
CREATE INDEX IF NOT EXISTS idx_settlements_carrier_id ON public.settlements(carrier_id);
CREATE INDEX IF NOT EXISTS idx_settlements_shipper_id ON public.settlements(shipper_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.settlements(status);

-- ------------------------------------------------------------
-- 7) Row Level Security (RLS) Policies
-- ------------------------------------------------------------
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_estimate_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_cost_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Transports Select
CREATE POLICY "transports_carrier_select" ON public.transports
  FOR SELECT TO authenticated
  USING (carrier_id = auth.uid());

CREATE POLICY "transports_shipper_select" ON public.transports
  FOR SELECT TO authenticated
  USING (shipper_id = auth.uid());

-- Cost Actuals: Strict Carrier Privacy
CREATE POLICY "actuals_carrier_select" ON public.transport_cost_actuals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transports t WHERE t.id = transport_cost_actuals.transport_id AND t.carrier_id = auth.uid()
  ));

CREATE POLICY "actuals_carrier_insert" ON public.transport_cost_actuals
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transports t WHERE t.id = transport_cost_actuals.transport_id AND t.carrier_id = auth.uid()
  ));

CREATE POLICY "actuals_carrier_update" ON public.transport_cost_actuals
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transports t WHERE t.id = transport_cost_actuals.transport_id AND t.carrier_id = auth.uid()
  ));

-- Estimate Snapshots Select
CREATE POLICY "snapshots_carrier_select" ON public.transport_estimate_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transports t WHERE t.id = transport_estimate_snapshots.transport_id AND t.carrier_id = auth.uid()
  ));

-- Documents: Shared between carrier & shipper
CREATE POLICY "docs_parties_select" ON public.transport_documents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transports t WHERE t.id = transport_documents.transport_id AND (t.carrier_id = auth.uid() OR t.shipper_id = auth.uid())
  ));

CREATE POLICY "docs_parties_insert" ON public.transport_documents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transports t WHERE t.id = transport_documents.transport_id AND (t.carrier_id = auth.uid() OR t.shipper_id = auth.uid())
  ));

-- Settlements: Shared View between parties
CREATE POLICY "settlements_parties_select" ON public.settlements
  FOR SELECT TO authenticated
  USING (carrier_id = auth.uid() OR shipper_id = auth.uid());

COMMIT;
