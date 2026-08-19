import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateCarrierWallet } from "../../../utils/walletService";

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
 * GET /api/wallet
 * Returns live wallet balances and transaction history for authenticated carrier.
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const carrierId = searchParams.get("carrierId");
    const role = searchParams.get("role");

    // Shipper Isolation: Shippers cannot query carrier wallet
    if (role === "shipper") {
      return NextResponse.json(
        { success: false, error: "Yük veren hesapları taşıyıcı cüzdan verilerine erişemez." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // Fetch carrier settlements from Supabase
    let query = supabase.from("settlements").select(`
      id,
      transport_id,
      carrier_id,
      bid_amount,
      settlement_amount,
      estimated_cost,
      actual_cost,
      estimated_profit,
      actual_profit,
      estimated_margin_percent,
      actual_margin_percent,
      status,
      approved_at,
      paid_at,
      created_at
    `);

    if (carrierId) {
      query = query.eq("carrier_id", carrierId);
    }

    const { data: dbSettlements } = await query;
    const settlements = dbSettlements || [];

    // Memory state overrides for live testing / transitions
    const resolvedSettlements = settlements.map((s) => {
      const memStatus = global.__TORK_SETTLEMENT_STATES__?.get(s.id);
      return {
        ...s,
        status: memStatus || s.status,
      };
    });

    const walletSummary = calculateCarrierWallet(resolvedSettlements);

    return NextResponse.json({
      success: true,
      wallet: walletSummary,
      settlements: resolvedSettlements,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Cüzdan verisi alınamadı.", details: err.message },
      { status: 500 }
    );
  }
}
