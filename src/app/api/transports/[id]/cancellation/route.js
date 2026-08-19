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

// Global in-memory stores for runtime
global.__TORK_CANCELLATIONS__ = global.__TORK_CANCELLATIONS__ || new Map();
global.__TORK_ACTIVE_TRANSPORTS__ = global.__TORK_ACTIVE_TRANSPORTS__ || new Map();
global.__TORK_TRANSPORT_STATES__ = global.__TORK_TRANSPORT_STATES__ || new Map();

const CANCELLABLE_STATUSES = ["assigned", "pickup_pending"];

/**
 * GET /api/transports/[id]/cancellation
 * Fetches cancellation status and requests for a transport.
 */
export async function GET(request, { params }) {
  try {
    const { id: transportId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

    if (!transportId) {
      return NextResponse.json(
        { success: false, error: "Taşıma kimliği (transportId) gereklidir." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // Fetch transport to verify caller authorization
    let transport = null;
    for (const [, tr] of global.__TORK_ACTIVE_TRANSPORTS__.entries()) {
      if (tr.id === transportId || tr.load_id === transportId) {
        transport = tr;
        break;
      }
    }

    if (!transport) {
      const { data: dbTransport } = await supabase
        .from("transports")
        .select("id, carrier_id, shipper_id, status")
        .eq("id", transportId)
        .single();
      transport = dbTransport;
    }

    // Verify user authorization if userId or authHeader is provided
    if (userId && transport) {
      if (transport.carrier_id !== userId && transport.shipper_id !== userId) {
        return NextResponse.json(
          { success: false, error: "Bu taşımanın iptal bilgilerini görüntüleme yetkiniz yoktur." },
          { status: 403 }
        );
      }
    }

    // Check cancellation in-memory or in database
    const requests = global.__TORK_CANCELLATIONS__.get(transportId) || [];
    const pendingRequest = requests.find((r) => r.status === "pending") || null;
    const latestRequest = requests.length > 0 ? requests[requests.length - 1] : null;

    return NextResponse.json({
      success: true,
      transport_id: transportId,
      pending_request: pendingRequest,
      latest_request: latestRequest,
      all_requests: requests,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/transports/[id]/cancellation
 * Creates a mutual cancellation request.
 */
export async function POST(request, { params }) {
  try {
    const { id: transportId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason, userId, role } = body;
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

    if (!transportId) {
      return NextResponse.json(
        { success: false, error: "Taşıma kimliği (transportId) gereklidir." },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: "İptal gerekçesi belirtilmelidir." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // 1. Fetch transport details & status
    let transport = null;
    for (const [, tr] of global.__TORK_ACTIVE_TRANSPORTS__.entries()) {
      if (tr.id === transportId || tr.load_id === transportId) {
        transport = tr;
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
    }

    // Check transport state override in memory if any
    const inMemState = global.__TORK_TRANSPORT_STATES__.get(transportId);
    const currentStatus = inMemState || transport?.status || "assigned";

    // 2. Authorization check
    if (transport && userId) {
      const isParty = transport.carrier_id === userId || transport.shipper_id === userId;
      if (!isParty) {
        return NextResponse.json(
          { success: false, error: "Bu taşıma için iptal talebi oluşturma yetkiniz bulunmamaktadır." },
          { status: 403 }
        );
      }
    }

    // 3. State eligibility check
    if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `İptal talebi yalnızca sevkiyat başlamadan önce (atandı veya yükleme aşamasında) yapılabilir. Mevcut durum: ${currentStatus}`,
          code: "CANCELLATION_NOT_ALLOWED_IN_CURRENT_STATE",
          current_status: currentStatus,
        },
        { status: 400 }
      );
    }

    // 4. Duplicate pending request check
    const existingRequests = global.__TORK_CANCELLATIONS__.get(transportId) || [];
    const hasPending = existingRequests.some((r) => r.status === "pending");

    if (hasPending) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu sevkiyat için zaten onay bekleyen bir iptal talebi bulunmaktadır.",
          code: "DUPLICATE_PENDING_CANCELLATION",
        },
        { status: 409 }
      );
    }

    // Determine requester role
    let effectiveRole = role;
    if (!effectiveRole && transport && userId) {
      effectiveRole = transport.carrier_id === userId ? "carrier" : "shipper";
    }

    // 5. Create cancellation request
    const newRequest = {
      id: `canc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      transport_id: transportId,
      requested_by: userId || "user",
      requested_by_role: effectiveRole || "carrier",
      status: "pending",
      reason: reason.trim(),
      responded_by: null,
      responded_at: null,
      created_at: new Date().toISOString(),
    };

    global.__TORK_CANCELLATIONS__.set(transportId, [...existingRequests, newRequest]);

    return NextResponse.json({
      success: true,
      message: "İptal talebi başarıyla oluşturuldu. Karşı tarafın onayı bekleniyor.",
      request: newRequest,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/transports/[id]/cancellation
 * Responds to a cancellation request (accept or reject).
 */
export async function PATCH(request, { params }) {
  try {
    const { id: transportId } = await params;
    const body = await request.json().catch(() => ({}));
    const { requestId, action, userId } = body;
    const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

    if (!transportId) {
      return NextResponse.json(
        { success: false, error: "Taşıma kimliği (transportId) gereklidir." },
        { status: 400 }
      );
    }

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz aksiyon. Sadece 'accept' veya 'reject' kabul edilir." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient(authHeader);

    // 1. Fetch transport
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

    // 2. Fetch cancellation requests
    const existingRequests = global.__TORK_CANCELLATIONS__.get(transportId) || [];
    const targetRequest = requestId
      ? existingRequests.find((r) => r.id === requestId)
      : existingRequests.find((r) => r.status === "pending");

    if (!targetRequest) {
      return NextResponse.json(
        { success: false, error: "İptal talebi bulunamadı." },
        { status: 404 }
      );
    }

    if (targetRequest.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Bu iptal talebi daha önce sonuçlandırılmıştır (Durum: ${targetRequest.status}).`,
          code: "CANCELLATION_ALREADY_RESOLVED",
        },
        { status: 400 }
      );
    }

    // 3. Requester cannot respond to their own request
    if (userId && targetRequest.requested_by === userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Kendi oluşturduğunuz iptal talebini onaylayamaz veya reddedemezsiniz. Karşı tarafın yanıtı gereklidir.",
          code: "CANNOT_RESPOND_TO_OWN_REQUEST",
        },
        { status: 403 }
      );
    }

    // 4. Authorization check for counterparty
    if (transport && userId) {
      const isParty = transport.carrier_id === userId || transport.shipper_id === userId;
      if (!isParty) {
        return NextResponse.json(
          { success: false, error: "Bu taşıma için işlem yapma yetkiniz bulunmamaktadır." },
          { status: 403 }
        );
      }
    }

    // 5. If action is ACCEPT: check transport is still in cancellable state
    if (action === "accept") {
      if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
        return NextResponse.json(
          {
            success: false,
            error: `Sevkiyat durumu değiştiği için iptal edilemez. Mevcut durum: ${currentStatus}`,
            code: "TRANSPORT_STATE_CHANGED",
            current_status: currentStatus,
          },
          { status: 409 }
        );
      }

      // Mark request accepted
      targetRequest.status = "accepted";
      targetRequest.responded_by = userId || "counterparty";
      targetRequest.responded_at = new Date().toISOString();

      // Update transport status to CANCELLED
      global.__TORK_TRANSPORT_STATES__.set(transportId, "cancelled");

      // Free carrier active transport
      if (transportCarrierId) {
        global.__TORK_ACTIVE_TRANSPORTS__.delete(transportCarrierId);
      }
      if (targetRequest.requested_by_role === "carrier" && targetRequest.requested_by) {
        global.__TORK_ACTIVE_TRANSPORTS__.delete(targetRequest.requested_by);
      }
      if (userId) {
        global.__TORK_ACTIVE_TRANSPORTS__.delete(userId);
      }
      // Also scan global.__TORK_ACTIVE_TRANSPORTS__ for any matching transport_id
      for (const [cId, tr] of global.__TORK_ACTIVE_TRANSPORTS__.entries()) {
        if (tr.id === transportId || tr.load_id === transportId) {
          global.__TORK_ACTIVE_TRANSPORTS__.delete(cId);
        }
      }

      // Update Supabase DB if possible
      if (transport?.id) {
        await supabase
          .from("transports")
          .update({ status: "cancelled" })
          .eq("id", transport.id);
      }

      return NextResponse.json({
        success: true,
        message: "Sevkiyat iptal talebi kabul edildi. Taşıma iptal edildi.",
        action: "accepted",
        transport_id: transportId,
        transport_status: "cancelled",
        request: targetRequest,
      });
    } else {
      // Mark request REJECTED
      targetRequest.status = "rejected";
      targetRequest.responded_by = userId || "counterparty";
      targetRequest.responded_at = new Date().toISOString();

      return NextResponse.json({
        success: true,
        message: "Sevkiyat iptal talebi reddedildi. Taşıma aktif olarak devam ediyor.",
        action: "rejected",
        transport_id: transportId,
        transport_status: currentStatus,
        request: targetRequest,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
