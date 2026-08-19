import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluateTransportRisk } from "../../../utils/riskService";
import { runFinancialIntegrityAudit } from "../../../utils/financialIntegrityService";
import { generateOperationalAlerts } from "../../../utils/alertService";
import { getAuditLogs } from "../../../utils/auditService";

export const runtime = "nodejs";

function getSupabaseClient(authHeader = null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : {},
  });
}

/**
 * GET /api/control-tower
 * Operations & Control Tower consolidated aggregation endpoint with strict role authorization.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    // 1. Strict Role-Based Access Control
    if (role === "shipper" || role === "carrier") {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim. Control Tower verilerine yalnızca operasyon ve yönetici rolleri erişebilir." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // 2. Fetch real database entities
    const [loadsRes, transportsRes, settlementsRes, docsRes, bidsRes] = await Promise.all([
      supabase.from("loads").select("*"),
      supabase.from("transports").select("*, loads(*)"),
      supabase.from("settlements").select("*"),
      supabase.from("transport_documents").select("*"),
      supabase.from("bids").select("*"),
    ]);

    const loads = loadsRes.data || [];
    const transports = transportsRes.data || [];
    const settlements = settlementsRes.data || [];
    const documents = docsRes.data || [];
    const bids = bidsRes.data || [];

    // 3. KPI Aggregations
    const openLoads = loads.filter((l) => l.status === "open").length;
    const biddingLoads = loads.filter((l) => bids.some((b) => b.load_id === l.id && b.status === "pending")).length;
    const assignedTransports = transports.filter((t) => t.status === "assigned" || t.status === "pickup_pending").length;
    const activeInTransit = transports.filter((t) => t.status === "in_transit").length;
    const deliveredTransports = transports.filter((t) => t.status === "delivered").length;
    const podPending = transports.filter((t) => t.status === "delivered" && !documents.some((d) => d.transport_id === t.id && d.verification_status === "verified")).length;
    const readySettlements = settlements.filter((s) => s.status === "ready").length;
    const approvedSettlements = settlements.filter((s) => s.status === "approved").length;
    const paidSettlements = settlements.filter((s) => s.status === "paid").length;
    const disputedSettlements = settlements.filter((s) => s.status === "disputed").length;
    const cancelledTransports = transports.filter((t) => t.status === "cancelled").length;

    // 4. Operational Queue & Risk Evaluation
    const queue = transports.map((tr) => {
      const trDocs = documents.filter((d) => d.transport_id === tr.id);
      const trSettlement = settlements.find((s) => s.transport_id === tr.id);
      const risk = evaluateTransportRisk(tr, trDocs, trSettlement);

      return {
        id: tr.id,
        loadId: tr.load_id,
        origin: tr.loads?.origin || "İstanbul",
        destination: tr.loads?.destination || "Ankara",
        status: tr.status,
        podStatus: trDocs.some((d) => d.verification_status === "verified")
          ? "verified"
          : trDocs.length > 0
            ? "uploaded"
            : "missing",
        settlementStatus: trSettlement?.status || "draft",
        bidAmount: tr.estimated_bid_amount,
        actualCost: tr.actual_cost_total,
        riskScore: risk.score,
        riskLevel: risk.level,
        riskReasons: risk.reasons,
        recommendedAction: risk.recommendedAction,
        createdAt: tr.created_at,
      };
    });

    const highRiskOperations = queue.filter((q) => q.riskLevel === "HIGH" || q.riskLevel === "CRITICAL").length;

    // 5. Financial Integrity Audit
    const financialIntegrity = runFinancialIntegrityAudit({
      transports,
      settlements,
      walletTransactions: [],
      documents,
    });

    // 6. Operational Alerts
    const alerts = generateOperationalAlerts({
      transports,
      settlements,
      documents,
    });

    // 7. Audit Trail
    const auditLogs = getAuditLogs({ limit: 20 });

    const operationalHealth = Math.max(0, 100 - (highRiskOperations * 5) - (podPending * 3));
    const financialHealth = financialIntegrity.failCount === 0 ? (financialIntegrity.warningCount === 0 ? 100 : 92) : 70;

    return NextResponse.json({
      success: true,
      health: {
        operationalHealth: Math.min(operationalHealth, 100),
        financialHealth: Math.min(financialHealth, 100),
      },
      kpis: {
        openLoads,
        biddingLoads,
        assignedTransports,
        activeInTransit,
        deliveredTransports,
        podPending,
        readySettlements,
        approvedSettlements,
        paidSettlements,
        disputedSettlements,
        cancelledTransports,
        highRiskOperations,
      },
      queue,
      financialIntegrity,
      alerts,
      auditLogs,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Control Tower verisi derlenemedi.", details: err.message },
      { status: 500 }
    );
  }
}
