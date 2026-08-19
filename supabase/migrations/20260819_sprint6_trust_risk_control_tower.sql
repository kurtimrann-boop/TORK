-- ============================================================
-- TORK — Sprint 6: Trust, Risk & Control Tower Migration
-- ============================================================

BEGIN;

-- 1) Table: audit_logs (Immutable System-Wide Audit Trail)
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

-- 2) Table: operational_alerts (Prioritized Control Tower Alerts)
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

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_status ON public.operational_alerts(severity, status);

-- 4) Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

-- Audit logs only accessible to administrators and operations
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'operator')
  ));

-- Operational alerts only accessible to administrators and operations
CREATE POLICY "operational_alerts_admin_select" ON public.operational_alerts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'operator')
  ));

COMMIT;
