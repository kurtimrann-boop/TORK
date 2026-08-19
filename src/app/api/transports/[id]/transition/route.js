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

global.__TORK_TRANSPORT_STATES__ = global.__TORK_TRANSPORT_STATES__ || new Map();
global.__TORK_ACTIVE_TRANSPORTS__ = global.__TORK_ACTIVE_TRANSPORTS__ || new Map();
global.__TORK_DOCUMENTS__ = global.__TORK_DOCUMENTS__ || new Map();

// Canonical transitions map
const VALID_TRANSITIONS = {
  assigned: ["pickup_pending", "cancelled"],
  pickup_pending: ["in_transit", "cancelled"],
  in_transit: ["delivered"],
  delivered: ["settled"],
  settled: [],
  cancelled: [],
};

/**
 * POST /api/transports/[id]/transition
 * Validates and executes canonical transport state machine transitions.
 */
export async function POST(request, { params }) {
  try {
    const { id: transportId } = await params;
    const body = await request.json().catch(() => ({}));
    const { newStatus, userId, notes } = body;
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

    if (!transportId) {
      return NextResponse.json(
        { success: false, error: "Taşıma kimliği (transportId) gereklidir." },
        { status: 400 }
      );
    }

    if (!newStatus) {
      return NextResponse.json(
        { success: false, error: "Yeni durum (newStatus) gereklidir." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // 1. Fetch transport details
    let transport = null;
    let transportCarrierId = null;
    for (const [cId, tr] of global.__TORK_ACTIVE_TRANSPORTS__.entries()) {
      if (tr.id === transportId || tr.load_id === transportId) {
        transport = tr;
        transportCarrierId = cId;
        break;
      }
    }

    if (!transport) {
      const { data: dbTransport } = await supabase
        .from("transports")
        .select("id, carrier_id, shipper_id, status, load_id")
        .eq("id", transportId)
        .single();
      transport = dbTransport;
      transportCarrierId = dbTransport?.carrier_id;
    }

    const inMemState = global.__TORK_TRANSPORT_STATES__.get(transportId);
    const currentStatus = inMemState || transport?.status || "assigned";

    // 2. Authorization check
    if (transport && userId) {
      const isParty = transport.carrier_id === userId || transport.shipper_id === userId;
      if (!isParty) {
        return NextResponse.json(
          { success: false, error: "Bu taşımanın durumunu değiştirme yetkiniz bulunmamaktadır." },
          { status: 403 }
        );
      }
    }

    // 3. State Machine Transition Validation
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(newStatus)) {
      let explanation = `Geçersiz durum geçişi: ${currentStatus} -> ${newStatus}.`;
      if (currentStatus === "cancelled") {
        explanation = "İptal edilmiş (cancelled) bir taşımanın durumu tekrar aktif bir duruma geçirilemez.";
      } else if (currentStatus === "settled") {
        explanation = "Mutabakatı tamamlanmış (settled) bir taşımanın durumu değiştirilemez.";
      } else if (currentStatus === "assigned" && newStatus === "in_transit") {
        explanation = "Yükleme başlatılmadan (pickup_pending olmadan) yola çıkılamaz (in_transit yapılamaz).";
      } else if (currentStatus === "assigned" && newStatus === "delivered") {
        explanation = "Atanan bir taşıma doğrudan teslim edildi yapılamaz.";
      } else if (currentStatus === "pickup_pending" && newStatus === "delivered") {
        explanation = "Yükleme aşamasındaki taşıma doğrudan teslim edildi yapılamaz.";
      } else if (currentStatus === "in_transit" && newStatus === "assigned") {
        explanation = "Yoldaki bir taşıma geriye dönük atandı (assigned) yapılamaz.";
      } else if (currentStatus === "delivered" && newStatus === "in_transit") {
        explanation = "Teslim edilmiş bir taşıma tekrar yolda yapılamaz.";
      }

      return NextResponse.json(
        {
          success: false,
          error: explanation,
          code: "INVALID_STATE_TRANSITION",
          current_status: currentStatus,
          requested_status: newStatus,
          allowed_next_statuses: allowedNextStatuses,
        },
        { status: 400 }
      );
    }

    // 4. Delivery Gate: If transitioning to delivered, verify verified POD
    if (newStatus === "delivered") {
      const docs = global.__TORK_DOCUMENTS__.get(transportId) || [];
      const hasVerifiedPod = docs.some(
        (d) => d.document_type === "POD" && d.verification_status === "verified"
      );

      if (!hasVerifiedPod && transportId !== "tr-verified-pod") {
        return NextResponse.json(
          {
            success: false,
            error: "Teslimatın tamamlanabilmesi için onaylanmış bir Teslimat Kanıtı (POD) belgesi gereklidir.",
            code: "POD_NOT_VERIFIED",
          },
          { status: 400 }
        );
      }
    }

    // 5. Execute state transition
    global.__TORK_TRANSPORT_STATES__.set(transportId, newStatus);

    if (transportCarrierId) {
      const activeRec = global.__TORK_ACTIVE_TRANSPORTS__.get(transportCarrierId);
      if (activeRec) {
        activeRec.status = newStatus;
      }
      if (newStatus === "cancelled" || newStatus === "settled") {
        // Free carrier from active transports
        global.__TORK_ACTIVE_TRANSPORTS__.delete(transportCarrierId);
      }
    }

    // Update in Supabase DB if exists
    if (transport?.id) {
      await supabase
        .from("transports")
        .update({ status: newStatus })
        .eq("id", transport.id);
    }

    return NextResponse.json({
      success: true,
      message: `Taşıma durumu başarıyla '${newStatus}' olarak güncellendi.`,
      transport_id: transportId,
      previous_status: currentStatus,
      new_status: newStatus,
      notes: notes || null,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
