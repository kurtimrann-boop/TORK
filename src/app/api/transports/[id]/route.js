import { NextResponse } from "next/server";

export const runtime = "nodejs";

// In-memory mock store for transports when running standalone
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "carrier";

    // Dummy transport data for API validation
    const transport = {
      id,
      load_id: "load-123",
      bid_id: "bid-456",
      carrier_id: "carrier-789",
      shipper_id: "shipper-101",
      status: "in_transit",
      estimated_distance_km: 729.8,
      estimated_duration_minutes: 525,
      actual_distance_km: null,
      actual_duration_minutes: null,
      estimated_bid_amount: 40000,
      estimated_cost_total: 30813,
      estimated_profit: 9187,
      estimated_margin_percent: 23.0,
    };

    // Strict Shipper Isolation: if caller is shipper, strip carrier-private internal costs
    if (role === "shipper") {
      const sanitized = {
        id: transport.id,
        load_id: transport.load_id,
        bid_id: transport.bid_id,
        status: transport.status,
        estimated_distance_km: transport.estimated_distance_km,
        estimated_duration_minutes: transport.estimated_duration_minutes,
        bid_amount: transport.estimated_bid_amount,
        // No estimated_cost_total, estimated_profit, estimated_margin_percent exposed!
      };
      return NextResponse.json({ success: true, transport: sanitized, role: "shipper" });
    }

    return NextResponse.json({ success: true, transport, role: "carrier" });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Taşıma detayı alınamadı.", details: err.message },
      { status: 500 }
    );
  }
}
