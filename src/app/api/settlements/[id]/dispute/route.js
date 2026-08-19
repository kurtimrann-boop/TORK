import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

global.__TORK_SETTLEMENT_STATES__ = global.__TORK_SETTLEMENT_STATES__ || new Map();
global.__TORK_DISPUTES__ = global.__TORK_DISPUTES__ || new Map();

/**
 * POST /api/settlements/[id]/dispute
 * Records a financial dispute and freezes the settlement.
 */
export async function POST(request, { params }) {
  try {
    const { id: settlementId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason, userId } = body;
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

    if (!settlementId) {
      return NextResponse.json(
        { success: false, error: "Mutabakat kimliği gereklidir." },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: "Uyuşmazlık gerekçesi belirtilmelidir." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // Freeze settlement status
    global.__TORK_SETTLEMENT_STATES__.set(settlementId, "disputed");

    const disputeRecord = {
      id: `disp-${Date.now()}`,
      settlement_id: settlementId,
      opened_by: userId,
      reason: reason.trim(),
      status: "open",
      created_at: new Date().toISOString(),
    };

    global.__TORK_DISPUTES__.set(settlementId, disputeRecord);

    await supabase
      .from("settlements")
      .update({ status: "disputed", updated_at: new Date().toISOString() })
      .eq("id", settlementId);

    return NextResponse.json({
      success: true,
      settlementId,
      status: "disputed",
      dispute: disputeRecord,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Uyuşmazlık kaydı oluşturulamadı.", details: err.message },
      { status: 500 }
    );
  }
}
