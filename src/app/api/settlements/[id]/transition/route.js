import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateSettlementTransition } from "../../../../../utils/settlementService";

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

/**
 * POST /api/settlements/[id]/transition
 * Validates and executes canonical settlement state transitions.
 */
export async function POST(request, { params }) {
  try {
    const { id: settlementId } = await params;
    const body = await request.json().catch(() => ({}));
    const { targetStatus, userId, hasVerifiedPod = true, transportStatus = "delivered" } = body;
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

    if (!settlementId) {
      return NextResponse.json(
        { success: false, error: "Mutabakat kimliği (settlementId) gereklidir." },
        { status: 400 }
      );
    }

    if (!targetStatus) {
      return NextResponse.json(
        { success: false, error: "Hedef durum (targetStatus) gereklidir." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // 1. Fetch current settlement from memory or DB
    let currentStatus = global.__TORK_SETTLEMENT_STATES__.get(settlementId);

    if (!currentStatus) {
      const { data: dbSettlement } = await supabase
        .from("settlements")
        .select("id, status, carrier_id, shipper_id, transport_id")
        .eq("id", settlementId)
        .single();
      currentStatus = dbSettlement?.status || "draft";
    }

    // 2. Validate state machine transition & POD gate
    const validation = validateSettlementTransition(currentStatus, targetStatus, {
      hasVerifiedPod,
      transportStatus,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error, code: validation.code },
        { status: 400 }
      );
    }

    // 3. Apply state transition
    global.__TORK_SETTLEMENT_STATES__.set(settlementId, targetStatus);

    await supabase
      .from("settlements")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
        ...(targetStatus === "approved" ? { approved_at: new Date().toISOString() } : {}),
        ...(targetStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
      })
      .eq("id", settlementId);

    return NextResponse.json({
      success: true,
      settlementId,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Mutabakat geçişi yapılamadı.", details: err.message },
      { status: 500 }
    );
  }
}
