import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateCarrierTrustScore } from "../../../../../utils/carrierTrustService";

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
 * GET /api/carriers/[id]/trust
 * Returns deterministic carrier trust score and reliability breakdown.
 */
export async function GET(request, { params }) {
  try {
    const { id: carrierId } = await params;
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

    if (!carrierId) {
      return NextResponse.json(
        { success: false, error: "Taşıyıcı kimliği (carrierId) gereklidir." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // Fetch carrier transports, settlements, and PODs
    const [transportsRes, settlementsRes, docsRes] = await Promise.all([
      supabase.from("transports").select("id, status, actual_profit").eq("carrier_id", carrierId),
      supabase.from("settlements").select("id, status").eq("carrier_id", carrierId),
      supabase.from("transport_documents").select("id, document_type, verification_status").eq("uploaded_by", carrierId),
    ]);

    const transports = transportsRes.data || [];
    const settlements = settlementsRes.data || [];
    const docs = docsRes.data || [];

    const totalAssigned = transports.length;
    const completedTransports = transports.filter((t) => t.status === "delivered" || t.status === "settled").length;
    const cancelledTransports = transports.filter((t) => t.status === "cancelled").length;
    const negativeMarginTransports = transports.filter((t) => t.actual_profit !== null && t.actual_profit < 0).length;

    const totalPods = docs.filter((d) => d.document_type === "POD").length;
    const verifiedPods = docs.filter((d) => d.document_type === "POD" && d.verification_status === "verified").length;

    const totalSettlements = settlements.length;
    const disputedSettlements = settlements.filter((s) => s.status === "disputed").length;

    const trustScoreData = calculateCarrierTrustScore({
      totalAssigned,
      completedTransports,
      cancelledTransports,
      totalPods,
      verifiedPods,
      totalSettlements,
      disputedSettlements,
      negativeMarginTransports,
    });

    return NextResponse.json({
      success: true,
      carrierId,
      trustScore: trustScoreData,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Taşıyıcı güven skoru hesaplanamadı.", details: err.message },
      { status: 500 }
    );
  }
}
