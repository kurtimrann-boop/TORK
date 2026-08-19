import { NextResponse } from "next/server";
import { createTransportEstimateSnapshot } from "../../../../utils/transportActualsService";
import { calculateOperatingPricing } from "../../../../utils/pricingService";

export const runtime = "nodejs";

// Global active transport registry for Node.js runtime standalone/in-memory enforcement
global.__TORK_ACTIVE_TRANSPORTS__ = global.__TORK_ACTIVE_TRANSPORTS__ || new Map();

const ACTIVE_TRANSPORT_STATUSES = [
  "assigned",
  "pickup_pending",
  "in_transit",
  "pod_pending",
  "pod_uploaded",
  "pod_verifying",
  "pod_verified",
  "delivered",
  "settlement_pending",
];

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id: customId,
      transportId: explicitTransportId,
      loadId,
      bidId,
      carrierId,
      shipperId,
      bidAmount,
      vehicleType = "TIR",
      distanceKm = 730,
      durationMinutes = 525,
      loadProfile = null,
      customConsumption = null,
    } = body;

    const transportId = explicitTransportId || customId || `tr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (!loadId || !bidId || !carrierId || !shipperId || !bidAmount) {
      return NextResponse.json(
        { success: false, error: "Gerekli taşıma ve teklif parametreleri eksik." },
        { status: 400 }
      );
    }

    const numBid = Number(bidAmount);
    if (!Number.isFinite(numBid) || numBid <= 0) {
      return NextResponse.json(
        { success: false, error: "Geçersiz teklif tutarı." },
        { status: 400 }
      );
    }

    // Single Active Transport per Carrier Guard
    const carrierActive = global.__TORK_ACTIVE_TRANSPORTS__.get(carrierId);
    if (carrierActive && ACTIVE_TRANSPORT_STATUSES.includes(carrierActive.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Devam eden bir seferiniz bulunuyor. Yeni bir yük alabilmek için mevcut seferinizi tamamlamanız gerekiyor.",
          code: "CARRIER_HAS_ACTIVE_TRANSPORT",
        },
        { status: 409 }
      );
    }

    // 1. Calculate pricing estimate
    const pricing = calculateOperatingPricing({
      distanceKm,
      durationMinutes,
      vehicleType,
      customConsumption,
      loadProfile,
    });

    if (!pricing) {
      return NextResponse.json(
        { success: false, error: "Taşıma maliyet snapshot'ı oluşturulamadı." },
        { status: 500 }
      );
    }

    // 2. Generate Immutable Estimate Snapshot
    const estimateSnapshot = createTransportEstimateSnapshot(transportId, pricing, numBid);

    // 3. Generate Settlement Draft
    const settlementDraft = {
      transport_id: transportId,
      carrier_id: carrierId,
      shipper_id: shipperId,
      bid_amount: numBid,
      estimated_cost: estimateSnapshot.total_operating_cost,
      actual_cost: null,
      estimated_profit: estimateSnapshot.estimated_profit,
      actual_profit: null,
      estimated_margin_percent: estimateSnapshot.estimated_margin_percent,
      actual_margin_percent: null,
      settlement_amount: numBid,
      status: "draft",
      created_at: new Date().toISOString(),
    };

    const transport = {
      id: transportId,
      load_id: loadId,
      bid_id: bidId,
      carrier_id: carrierId,
      shipper_id: shipperId,
      status: "assigned",
      estimated_distance_km: pricing.route.distanceKm,
      estimated_duration_minutes: pricing.route.durationMinutes,
      actual_distance_km: null,
      actual_duration_minutes: null,
      estimated_cost_total: estimateSnapshot.total_operating_cost,
      estimated_bid_amount: numBid,
      estimated_profit: estimateSnapshot.estimated_profit,
      estimated_margin_percent: estimateSnapshot.estimated_margin_percent,
      actual_cost_total: null,
      actual_profit: null,
      actual_margin_percent: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Store in active transports registry
    global.__TORK_ACTIVE_TRANSPORTS__.set(carrierId, transport);

    return NextResponse.json({
      success: true,
      transport,
      estimateSnapshot,
      settlementDraft,
    });
  } catch (err) {
    console.error("[/api/transports/create] Error:", err);
    return NextResponse.json(
      { success: false, error: "Taşıma oluşturulurken sunucu hatası meydana geldi.", details: err.message },
      { status: 500 }
    );
  }
}

