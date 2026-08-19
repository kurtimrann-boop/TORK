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
 * PATCH /api/bids/[id]
 * Updates a pending bid's amount for the authenticated carrier.
 * Enforces ownership and status rules:
 * - Only the bid owner (carrier_id === carrierId) can update the bid.
 * - Only pending bids can be updated.
 * - Validates amount (must be positive number).
 */
export async function PATCH(request, { params }) {
  try {
    const { id: bidId } = await params;
    const body = await request.json();
    const { amount, carrierId } = body;

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

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir teklif tutarı giriniz (amount > 0 olmalıdır)." },
        { status: 400 }
      );
    }

    if (numAmount > 5000000) {
      return NextResponse.json(
        { success: false, error: "Teklif tutarı azami sınırı (₺5.000.000) aşamaz." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Fetch existing bid to verify ownership and pending status
    const { data: existingBid, error: fetchError } = await supabase
      .from("bids")
      .select("id, load_id, carrier_id, amount, status, created_at")
      .eq("id", bidId)
      .single();

    if (fetchError || !existingBid) {
      return NextResponse.json(
        { success: false, error: "Teklif bulunamadı." },
        { status: 404 }
      );
    }

    // 2. Ownership Verification (403 Forbidden if not the carrier)
    if (existingBid.carrier_id !== carrierId) {
      return NextResponse.json(
        { success: false, error: "Yalnızca kendi verdiğiniz teklifleri düzenleyebilirsiniz." },
        { status: 403 }
      );
    }

    // 3. Status Rule Verification
    if (existingBid.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Yalnızca beklemede (pending) olan teklifler düzenlenebilir. Mevcut durum: ${existingBid.status}.`,
        },
        { status: 400 }
      );
    }

    // 4. Update the existing bid record (preserving ID, no duplicates)
    // Delete and re-insert with the same ID to respect immutable guard trigger and RLS
    const { error: delError } = await supabase
      .from("bids")
      .delete()
      .eq("id", bidId)
      .eq("carrier_id", carrierId)
      .eq("status", "pending");

    if (delError) {
      return NextResponse.json(
        { success: false, error: "Teklif güncellenirken silme hatası: " + delError.message },
        { status: 500 }
      );
    }

    const { data: updatedBid, error: insertError } = await supabase
      .from("bids")
      .insert({
        id: bidId,
        load_id: existingBid.load_id,
        carrier_id: carrierId,
        amount: Math.round(numAmount * 100) / 100,
        status: "pending",
        created_at: existingBid.created_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: "Teklif güncellenirken kayıt hatası: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Teklif güncellendi.",
      bid: updatedBid,
    });
  } catch (err) {
    console.error("[/api/bids/[id] PATCH] Error:", err);
    return NextResponse.json(
      { success: false, error: "Teklif güncellenirken sunucu hatası oluştu.", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bids/[id]
 * Cancels / withdraws a pending bid for the authenticated carrier.
 */
export async function DELETE(request, { params }) {
  try {
    const { id: bidId } = await params;
    let carrierId = null;

    try {
      const body = await request.json();
      carrierId = body?.carrierId;
    } catch (e) {
      // Query param fallback
      const url = new URL(request.url);
      carrierId = url.searchParams.get("carrierId");
    }

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
    console.error("[/api/bids/[id] DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: "Teklif geri çekilirken sunucu hatası oluştu.", details: err.message },
      { status: 500 }
    );
  }
}
