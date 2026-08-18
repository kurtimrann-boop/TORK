import { NextResponse } from "next/server";
import { compareEstimatedVsActual, evaluateSettlementEligibility } from "../../../../../utils/transportActualsService";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Mock transport snapshot & actuals for reconciliation
    const mockEstimateSnapshot = {
      transport_id: id,
      distance_km: 729.8,
      duration_minutes: 525,
      total_operating_cost: 30813,
      bid_amount: 40000,
      estimated_profit: 9187,
      estimated_margin_percent: 23.0,
    };

    const mockActuals = {
      fuel_cost: 18500,
      driver_cost: 2154,
      toll_cost: null,
      maintenance_cost: 3650,
      depreciation_cost: 4380,
      waiting_cost: null,
    };

    const variance = compareEstimatedVsActual(mockEstimateSnapshot, mockActuals, 40000);
    const eligibility = evaluateSettlementEligibility(
      { id, status: "delivered" },
      [{ document_type: "POD" }],
      true
    );

    const settlement = {
      transport_id: id,
      bid_amount: 40000,
      settlement_amount: 40000,
      estimated_cost: mockEstimateSnapshot.total_operating_cost,
      actual_cost: variance.actualCost,
      estimated_profit: mockEstimateSnapshot.estimated_profit,
      actual_profit: variance.actualProfit,
      cost_variance: variance.costVariance,
      cost_variance_percent: variance.costVariancePercent,
      data_completeness: variance.dataCompleteness,
      status: eligibility.isEligible ? "ready" : eligibility.status,
      eligibility,
    };

    return NextResponse.json({
      success: true,
      settlement,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Mutabakat verisi alınamadı.", details: err.message },
      { status: 500 }
    );
  }
}
