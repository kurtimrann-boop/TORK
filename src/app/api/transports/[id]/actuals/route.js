import { NextResponse } from "next/server";
import { calculateActualCost, calculateActualProfit, calculateActualMargin } from "../../../../../utils/transportActualsService";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      bidAmount = 40000,
      fuelLiters,
      fuelPricePerLiter,
      fuelCost,
      driverCost,
      tollCost,
      maintenanceCost,
      depreciationCost,
      waitingHours,
      waitingCost,
      specialHandlingCost,
      otherCost,
      notes,
      sourceType = "DRIVER_RECEIPT",
      sourceName = "Taşıyıcı Girişi",
    } = body;

    const actualsData = {
      fuel_liters: fuelLiters ?? null,
      fuel_price_per_liter: fuelPricePerLiter ?? null,
      fuel_cost: fuelCost ?? (fuelLiters && fuelPricePerLiter ? Math.round(fuelLiters * fuelPricePerLiter) : null),
      driver_cost: driverCost ?? null,
      toll_cost: tollCost ?? null,
      maintenance_cost: maintenanceCost ?? null,
      depreciation_cost: depreciationCost ?? null,
      waiting_hours: waitingHours ?? null,
      waiting_cost: waitingCost ?? null,
      special_handling_cost: specialHandlingCost ?? null,
      other_cost: otherCost ?? null,
      notes: notes ?? null,
      source_type: sourceType,
      source_name: sourceName,
    };

    const { totalActualCost, dataCompleteness } = calculateActualCost(actualsData);
    const actualProfit = calculateActualProfit(bidAmount, totalActualCost);
    const actualMargin = calculateActualMargin(bidAmount, actualProfit);

    return NextResponse.json({
      success: true,
      transportId: id,
      actuals: actualsData,
      totalActualCost,
      actualProfit,
      actualMargin,
      dataCompleteness,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Gerçekleşen maliyet kaydedilemedi.", details: err.message },
      { status: 500 }
    );
  }
}
