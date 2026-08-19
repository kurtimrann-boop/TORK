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

// Global active transport registry and carrier lock for concurrency serialization
global.__TORK_ACTIVE_TRANSPORTS__ = global.__TORK_ACTIVE_TRANSPORTS__ || new Map();
global.__TORK_CARRIER_LOCKS__ = global.__TORK_CARRIER_LOCKS__ || new Set();

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

export async function POST(request, { params }) {
  const { id: bidId } = await params;
  const body = await request.json().catch(() => ({}));
  const { shipperId } = body;
  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");

  if (!bidId) {
    return NextResponse.json(
      { success: false, error: "Teklif kimliği (bidId) gereklidir." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient(authHeader);

  // 1. Fetch the target bid and its load
  const { data: bid, error: bidErr } = await supabase
    .from("bids")
    .select("id, load_id, carrier_id, amount, status, created_at, loads(id, shipper_id)")
    .eq("id", bidId)
    .single();

  if (bidErr || !bid) {
    return NextResponse.json(
      { success: false, error: "Teklif bulunamadı." },
      { status: 404 }
    );
  }

  // IDOR Protection: Verify shipper owns the load
  if (shipperId && bid.loads?.shipper_id && bid.loads.shipper_id !== shipperId) {
    return NextResponse.json(
      { success: false, error: "Yetkisiz işlem. Yalnızca kendi yüklerinize gelen teklifleri kabul edebilirsiniz." },
      { status: 403 }
    );
  }

  if (bid.status !== "pending") {
    return NextResponse.json(
      { success: false, error: "Yalnızca beklemede (pending) olan teklifler kabul edilebilir." },
      { status: 400 }
    );
  }

  const carrierId = bid.carrier_id;

  // 2. Concurrency Lock: Check if another acceptance for this carrier is in flight
  if (global.__TORK_CARRIER_LOCKS__.has(carrierId)) {
    return NextResponse.json(
      {
        success: false,
        error: "Bu taşıyıcı için eş zamanlı başka bir yük kabul işlemi yürütülüyor. Taşıyıcı başına yalnızca 1 aktif sefer atanabilir.",
        code: "CARRIER_CONCURRENT_ACCEPT_BLOCKED",
      },
      { status: 409 }
    );
  }

  // Acquire lock
  global.__TORK_CARRIER_LOCKS__.add(carrierId);

  try {
    // 3. Carrier Single Active Transport Check
    // A) Check global in-memory active store
    const memActive = global.__TORK_ACTIVE_TRANSPORTS__.get(carrierId);
    if (memActive && ACTIVE_TRANSPORT_STATUSES.includes(memActive.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Devam eden bir seferiniz bulunuyor. Yeni bir yük alabilmek için mevcut seferinizi tamamlamanız gerekiyor.",
          code: "CARRIER_HAS_ACTIVE_TRANSPORT",
        },
        { status: 409 }
      );
    }

    // B) Check Supabase transports table if active transport exists
    const { data: activeTransports } = await supabase
      .from("transports")
      .select("id, status")
      .eq("carrier_id", carrierId)
      .in("status", ACTIVE_TRANSPORT_STATUSES);

    if (activeTransports && activeTransports.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu taşıyıcının devam eden aktif bir seferi bulunmaktadır. Yeni bir yük atanamaz.",
          code: "CARRIER_HAS_ACTIVE_TRANSPORT",
        },
        { status: 409 }
      );
    }

    // 4. Accept the bid atomically via Supabase RPC
    const { data: rpcData, error: rpcErr } = await supabase.rpc("accept_bid_and_assign_load", {
      p_bid_id: bidId,
    });

    if (rpcErr) {
      return NextResponse.json(
        { success: false, error: rpcErr.message },
        { status: 400 }
      );
    }

    // Record in global active transport registry
    const transportRecord = {
      id: `tr-${Date.now()}`,
      load_id: bid.load_id,
      bid_id: bidId,
      carrier_id: carrierId,
      shipper_id: shipperId || bid.loads?.shipper_id,
      status: "assigned",
      bid_amount: bid.amount,
      created_at: new Date().toISOString(),
    };
    global.__TORK_ACTIVE_TRANSPORTS__.set(carrierId, transportRecord);

    return NextResponse.json({
      success: true,
      message: "Teklif başarıyla kabul edildi ve taşıma atandı.",
      data: rpcData,
      transport: transportRecord,
    });
  } finally {
    // Release lock
    global.__TORK_CARRIER_LOCKS__.delete(carrierId);
  }
}
