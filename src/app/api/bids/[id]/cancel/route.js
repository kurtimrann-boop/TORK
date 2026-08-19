import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * POST / PATCH /api/bids/[id]/cancel
 * Cancels a carrier's pending bid.
 */
export async function POST(request, { params }) {
  return handleCancel(request, params);
}

export async function PATCH(request, { params }) {
  return handleCancel(request, params);
}

async function handleCancel(request, params) {
  try {
    const { id: bidId } = await params;
    const body = await request.json().catch(() => ({}));
    const { carrierId } = body;

    if (!bidId) {
      return NextResponse.json(
        { success: false, error: "Teklif ID gereklidir." },
        { status: 400 }
      );
    }

    if (!carrierId) {
      return NextResponse.json(
        { success: false, error: "Taşıyıcı kimliği (carrierId) gereklidir." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Fetch existing bid
    const { data: existingBid, error: fetchError } = await supabase
      .from("bids")
      .select("id, carrier_id, status")
      .eq("id", bidId)
      .single();

    if (fetchError || !existingBid) {
      return NextResponse.json(
        { success: false, error: "Teklif bulunamadı." },
        { status: 404 }
      );
    }

    // 2. Ownership Verification
    if (existingBid.carrier_id !== carrierId) {
      return NextResponse.json(
        { success: false, error: "Yalnızca kendi verdiğiniz teklifleri geri çekebilirsiniz." },
        { status: 403 }
      );
    }

    // 3. Status Rule Verification
    if (existingBid.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Yalnızca beklemede (pending) olan teklifler geri çekilebilir. Mevcut durum: ${existingBid.status}.`,
        },
        { status: 400 }
      );
    }

    // 4. Delete the pending bid
    const { error: delError } = await supabase
      .from("bids")
      .delete()
      .eq("id", bidId)
      .eq("carrier_id", carrierId)
      .eq("status", "pending");

    if (delError) {
      return NextResponse.json(
        { success: false, error: "Teklif geri çekilirken hata oluştu: " + delError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Teklif geri çekildi.",
      cancelledBidId: bidId,
    });
  } catch (err) {
    console.error("[/api/bids/[id]/cancel] Error:", err);
    return NextResponse.json(
      { success: false, error: "Teklif geri çekilirken sunucu hatası oluştu.", details: err.message },
      { status: 500 }
    );
  }
}
